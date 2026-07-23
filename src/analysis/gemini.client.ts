import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppLocale } from '../config/env.validation';
import { LlmApiError } from '../llm/llm.errors';
import { LLM_CLIENT } from '../llm/llm.port';
import type { LlmClient } from '../llm/llm.port';
import { GEMINI_REQUEST_TIMEOUT_MS } from './gemini.constants';
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
  constructor(
    private readonly configService: ConfigService,
    @Inject(LLM_CLIENT) private readonly llmClient: LlmClient,
  ) {}

  async analyzeArticle(
    input: GeminiAnalyzeArticleInput,
  ): Promise<GeminiAnalysisResult> {
    const locale = this.configService.getOrThrow<AppLocale>('locale');

    try {
      const completion = await this.llmClient.completeJson({
        system: buildAnalysisSystemPrompt(locale),
        user: buildAnalysisUserPrompt(input),
        schemaVersion: 'news-analysis-v1',
        temperature: 0.2,
        maxOutputTokens: 1024,
        timeoutMs: GEMINI_REQUEST_TIMEOUT_MS,
      });

      try {
        return parseGeminiAnalysisText(completion.text);
      } catch (parseError) {
        throw new GeminiApiError(
          `Gemini response parse failed: ${errorMessage(parseError)}`,
          undefined,
          false,
        );
      }
    } catch (error) {
      if (error instanceof GeminiApiError) {
        throw error;
      }
      throw toGeminiApiError(error);
    }
  }
}

function toGeminiApiError(error: unknown): GeminiApiError {
  if (error instanceof LlmApiError) {
    return new GeminiApiError(
      error.message,
      error.statusCode,
      error.retryable,
      error.retryAfterMs,
    );
  }
  return new GeminiApiError(
    `Gemini request failed: ${errorMessage(error)}`,
    undefined,
    true,
  );
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
