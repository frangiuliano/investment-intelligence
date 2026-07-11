import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  GEMINI_FLASH_MODEL,
  GEMINI_REQUEST_TIMEOUT_MS,
} from './gemini.constants';
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
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_FLASH_MODEL}:generateContent`;

    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(),
      GEMINI_REQUEST_TIMEOUT_MS,
    );

    let response: Response;
    try {
      response = await fetch(url, {
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
    } catch (error) {
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

    if (!response.ok) {
      const body = await safeReadBody(response);
      const retryable = response.status === 429 || response.status >= 500;
      throw new GeminiApiError(
        `Gemini API ${response.status}: ${truncateLogBody(body)}`,
        response.status,
        retryable,
      );
    }

    const data = (await response.json()) as {
      candidates?: Array<{
        content?: { parts?: Array<{ text?: string }> };
      }>;
    };

    const text = data.candidates?.[0]?.content?.parts
      ?.map((part) => part.text ?? '')
      .join('')
      .trim();

    if (!text) {
      throw new GeminiApiError('Gemini returned empty response');
    }

    return parseGeminiAnalysisText(text);
  }
}

async function safeReadBody(response: Response): Promise<string> {
  try {
    return await response.text();
  } catch {
    return '(unreadable body)';
  }
}

function truncateLogBody(body: string, maxLength = 500): string {
  const trimmed = body.trim();
  if (trimmed.length <= maxLength) {
    return trimmed;
  }
  return `${trimmed.slice(0, maxLength)}…`;
}

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === 'AbortError';
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
