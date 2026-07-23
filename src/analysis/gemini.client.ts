import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppLocale } from '../config/env.validation';
import { ANALYSIS_PROMPT_VERSION } from '../knowledge/knowledge.constants';
import { KnowledgePackService } from '../knowledge/knowledge-pack.service';
import { appendKnowledgePackToSystemPrompt } from '../knowledge/knowledge-prompt';
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

export type AnalyzeArticleResult = GeminiAnalysisResult & {
  promptVersion: string;
  knowledgeVersion: string | null;
};

@Injectable()
export class GeminiClient {
  constructor(
    private readonly configService: ConfigService,
    @Inject(LLM_CLIENT) private readonly llmClient: LlmClient,
    private readonly knowledgePackService: KnowledgePackService,
  ) {}

  async analyzeArticle(
    input: GeminiAnalyzeArticleInput,
  ): Promise<AnalyzeArticleResult> {
    const locale = this.configService.getOrThrow<AppLocale>('locale');
    const textHints = [input.title, input.content ?? ''].join('\n');
    const knowledge = await this.knowledgePackService.buildInjection({
      useCase: 'news-analysis',
      textHints,
    });
    const system = appendKnowledgePackToSystemPrompt(
      buildAnalysisSystemPrompt(locale),
      knowledge.injection,
    );

    try {
      const completion = await this.llmClient.completeJson({
        system,
        user: buildAnalysisUserPrompt(input),
        schemaVersion: ANALYSIS_PROMPT_VERSION,
        temperature: 0.2,
        maxOutputTokens: 1024,
        timeoutMs: GEMINI_REQUEST_TIMEOUT_MS,
      });

      try {
        const parsed = parseGeminiAnalysisText(completion.text);
        return {
          ...parsed,
          promptVersion: ANALYSIS_PROMPT_VERSION,
          knowledgeVersion: knowledge.injection?.knowledgeVersion ?? null,
        };
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
