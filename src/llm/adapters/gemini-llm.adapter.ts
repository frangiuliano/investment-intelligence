import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LlmApiError } from '../llm.errors';
import { LlmClient } from '../llm.port';
import {
  errorMessage,
  isAbortError,
  readWithAbort,
  safeReadBody,
  truncateLogBody,
} from '../llm-http';
import { parseRetryAfterMs } from '../retry-after';
import {
  LlmCompleteJsonRequest,
  LlmCompleteJsonResult,
} from '../llm.types';

export const GEMINI_LLM_PROVIDER = 'gemini' as const;
const DEFAULT_TIMEOUT_MS = 30_000;
const DEFAULT_TEMPERATURE = 0.2;
const DEFAULT_MAX_OUTPUT_TOKENS = 1024;

@Injectable()
export class GeminiLlmAdapter implements LlmClient {
  constructor(private readonly configService: ConfigService) {}

  async completeJson(
    request: LlmCompleteJsonRequest,
  ): Promise<LlmCompleteJsonResult> {
    const apiKey = this.configService.getOrThrow<string>(
      'gemini.apiKeyFinance',
    );
    const model = this.configService.getOrThrow<string>('gemini.model');
    const timeoutMs = request.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey,
        },
        body: JSON.stringify({
          systemInstruction: {
            parts: [{ text: request.system }],
          },
          contents: [
            {
              role: 'user',
              parts: [{ text: request.user }],
            },
          ],
          generationConfig: {
            temperature: request.temperature ?? DEFAULT_TEMPERATURE,
            maxOutputTokens:
              request.maxOutputTokens ?? DEFAULT_MAX_OUTPUT_TOKENS,
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
        throw new LlmApiError(
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
        throw new LlmApiError(
          'Gemini returned empty response',
          undefined,
          false,
        );
      }

      return {
        text,
        provider: GEMINI_LLM_PROVIDER,
        model,
      };
    } catch (error) {
      if (error instanceof LlmApiError) {
        throw error;
      }
      if (isAbortError(error)) {
        throw new LlmApiError(
          `Gemini request timed out after ${timeoutMs}ms`,
          undefined,
          true,
        );
      }
      throw new LlmApiError(
        `Gemini request failed: ${errorMessage(error)}`,
        undefined,
        true,
      );
    } finally {
      clearTimeout(timeout);
    }
  }
}
