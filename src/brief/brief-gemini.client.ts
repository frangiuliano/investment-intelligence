import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppLocale } from '../config/env.validation';
import {
  BRIEF_GEMINI_TIMEOUT_MS,
  BRIEF_MAX_OUTPUT_TOKENS,
} from './brief.constants';
import {
  buildBriefSystemPrompt,
  buildBriefUserPrompt,
  parseBriefSectionsText,
} from './brief-prompt';
import { BriefHoldingContext, BriefSections } from './brief.types';

export class BriefGeminiApiError extends Error {
  constructor(
    message: string,
    readonly statusCode?: number,
    readonly retryable = false,
  ) {
    super(message);
    this.name = 'BriefGeminiApiError';
  }
}

export type GenerateBriefInput = {
  symbol: string;
  holding: BriefHoldingContext | null;
};

@Injectable()
export class BriefGeminiClient {
  constructor(private readonly configService: ConfigService) {}

  async generateBrief(input: GenerateBriefInput): Promise<BriefSections> {
    const apiKey = this.configService.getOrThrow<string>(
      'gemini.apiKeyFinance',
    );
    const model = this.configService.getOrThrow<string>('gemini.model');
    const locale = this.configService.getOrThrow<AppLocale>('locale');
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(),
      BRIEF_GEMINI_TIMEOUT_MS,
    );

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey,
        },
        body: JSON.stringify({
          systemInstruction: {
            parts: [{ text: buildBriefSystemPrompt(locale) }],
          },
          contents: [
            {
              role: 'user',
              parts: [{ text: buildBriefUserPrompt(input) }],
            },
          ],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: BRIEF_MAX_OUTPUT_TOKENS,
            responseMimeType: 'application/json',
          },
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const body = await safeReadBody(response, controller.signal);
        const retryable = response.status === 429 || response.status >= 500;
        throw new BriefGeminiApiError(
          `Brief Gemini API ${response.status}: ${truncateLogBody(body)}`,
          response.status,
          retryable,
        );
      }

      const data = await readWithAbort(
        response.json() as Promise<{
          candidates?: Array<{
            content?: { parts?: Array<{ text?: string }> };
          }>;
        }>,
        controller.signal,
      );

      const text = data.candidates?.[0]?.content?.parts
        ?.map((part) => part.text ?? '')
        .join('')
        .trim();

      if (!text) {
        throw new BriefGeminiApiError(
          'Brief Gemini returned empty response',
          undefined,
          false,
        );
      }

      try {
        return parseBriefSectionsText(text);
      } catch (parseError) {
        throw new BriefGeminiApiError(
          `Brief Gemini response parse failed: ${errorMessage(parseError)}`,
          undefined,
          false,
        );
      }
    } catch (error) {
      if (error instanceof BriefGeminiApiError) {
        throw error;
      }
      if (isAbortError(error)) {
        throw new BriefGeminiApiError(
          `Brief Gemini request timed out after ${BRIEF_GEMINI_TIMEOUT_MS}ms`,
          undefined,
          true,
        );
      }
      throw new BriefGeminiApiError(
        `Brief Gemini request failed: ${errorMessage(error)}`,
        undefined,
        true,
      );
    } finally {
      clearTimeout(timeout);
    }
  }
}

async function safeReadBody(
  response: Response,
  signal: AbortSignal,
): Promise<string> {
  try {
    return await readWithAbort(response.text(), signal);
  } catch (error) {
    if (isAbortError(error)) {
      throw error;
    }
    return '(unreadable body)';
  }
}

function readWithAbort<T>(
  promise: Promise<T>,
  signal: AbortSignal,
): Promise<T> {
  if (signal.aborted) {
    return Promise.reject(createAbortError());
  }

  return new Promise<T>((resolve, reject) => {
    const onAbort = () => {
      reject(createAbortError());
    };

    signal.addEventListener('abort', onAbort, { once: true });
    promise.then(
      (value) => {
        signal.removeEventListener('abort', onAbort);
        resolve(value);
      },
      (error: unknown) => {
        signal.removeEventListener('abort', onAbort);
        reject(error instanceof Error ? error : new Error(String(error)));
      },
    );
  });
}

function createAbortError(): Error {
  if (typeof DOMException === 'function') {
    return new DOMException('This operation was aborted', 'AbortError');
  }
  const error = new Error('This operation was aborted');
  error.name = 'AbortError';
  return error;
}

function truncateLogBody(body: string, maxLength = 500): string {
  const trimmed = body.trim();
  if (trimmed.length <= maxLength) {
    return trimmed;
  }
  return `${trimmed.slice(0, maxLength)}…`;
}

function isAbortError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'name' in error &&
    (error as { name: string }).name === 'AbortError'
  );
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
