import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GEMINI_REQUEST_TIMEOUT_MS } from './gemini.constants';
import { parseRetryAfterMs } from './gemini-retry';
import {
  GeminiAnalysisResult,
  buildAnalysisSystemPrompt,
  buildAnalysisUserPrompt,
  parseGeminiAnalysisText,
} from './gemini-response';

export class GeminiApiError extends Error {
  constructor(
    message: string,
    readonly statusCode?: number,
    readonly retryable = false,
    readonly retryAfterMs?: number,
  ) {
    super(message);
    this.name = 'GeminiApiError';
  }
}

export type GeminiAnalyzeArticleInput = {
  title: string;
  source: string;
  url: string;
  content: string | null;
};

@Injectable()
export class GeminiClient {
  constructor(private readonly configService: ConfigService) {}

  async analyzeArticle(
    input: GeminiAnalyzeArticleInput,
  ): Promise<GeminiAnalysisResult> {
    const apiKey = this.configService.getOrThrow<string>(
      'gemini.apiKeyFinance',
    );
    const model = this.configService.getOrThrow<string>('gemini.model');
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(),
      GEMINI_REQUEST_TIMEOUT_MS,
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
            parts: [{ text: buildAnalysisSystemPrompt() }],
          },
          contents: [
            {
              role: 'user',
              parts: [{ text: buildAnalysisUserPrompt(input) }],
            },
          ],
          generationConfig: {
            temperature: 0.2,
            maxOutputTokens: 1024,
            responseMimeType: 'application/json',
          },
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const body = await safeReadBody(response, controller.signal);
        const retryable = response.status === 429 || response.status >= 500;
        const retryAfterMs = parseRetryAfterMs(
          body,
          response.headers.get('retry-after'),
        );
        throw new GeminiApiError(
          `Gemini API ${response.status}: ${truncateLogBody(body)}`,
          response.status,
          retryable,
          retryAfterMs,
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
        throw new GeminiApiError('Gemini returned empty response');
      }

      return parseGeminiAnalysisText(text);
    } catch (error) {
      if (error instanceof GeminiApiError) {
        throw error;
      }
      if (isAbortError(error)) {
        throw new GeminiApiError(
          `Gemini request timed out after ${GEMINI_REQUEST_TIMEOUT_MS}ms`,
          undefined,
          true,
        );
      }
      throw new GeminiApiError(
        `Gemini request failed: ${errorMessage(error)}`,
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
