import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppLocale } from '../config/env.validation';
import { KnowledgePackService } from '../knowledge/knowledge-pack.service';
import { appendKnowledgePackToSystemPrompt } from '../knowledge/knowledge-prompt';
import { LlmApiError } from '../llm/llm.errors';
import { LLM_CLIENT } from '../llm/llm.port';
import type { LlmClient } from '../llm/llm.port';
import {
  BRIEF_GEMINI_TIMEOUT_MS,
  BRIEF_MAX_OUTPUT_TOKENS,
  BRIEF_PROMPT_VERSION,
} from './brief.constants';
import {
  buildBriefSystemPrompt,
  buildBriefUserPrompt,
  parseBriefResponseText,
} from './brief-prompt';
import { BriefGenerationResult, BriefHoldingContext } from './brief.types';

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
  marketFacts: string | null;
};

@Injectable()
export class BriefGeminiClient {
  constructor(
    private readonly configService: ConfigService,
    @Inject(LLM_CLIENT) private readonly llmClient: LlmClient,
    private readonly knowledgePackService: KnowledgePackService,
  ) {}

  async generateBrief(
    input: GenerateBriefInput,
  ): Promise<BriefGenerationResult> {
    const locale = this.configService.getOrThrow<AppLocale>('locale');
    const expectStance = input.marketFacts !== null;
    const hasHolding = input.holding !== null;
    const knowledge = await this.knowledgePackService.buildInjection({
      useCase: 'research-brief',
      assetTypes: input.holding?.assetTypes,
      includeStanceRubric: expectStance,
    });
    const system = appendKnowledgePackToSystemPrompt(
      buildBriefSystemPrompt(locale, {
        hasHolding,
        expectStance,
      }),
      knowledge.injection,
    );

    try {
      const completion = await this.llmClient.completeJson({
        system,
        user: buildBriefUserPrompt(input),
        schemaVersion: BRIEF_PROMPT_VERSION,
        temperature: 0.3,
        maxOutputTokens: BRIEF_MAX_OUTPUT_TOKENS,
        timeoutMs: BRIEF_GEMINI_TIMEOUT_MS,
      });

      try {
        const parsed = parseBriefResponseText(completion.text, {
          expectStance,
          hasHolding,
        });
        return {
          ...parsed,
          knowledgeVersion: knowledge.knowledgeVersion,
        };
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
      throw toBriefGeminiApiError(error);
    }
  }
}

function toBriefGeminiApiError(error: unknown): BriefGeminiApiError {
  if (error instanceof LlmApiError) {
    return new BriefGeminiApiError(
      error.message.startsWith('Brief ')
        ? error.message
        : `Brief ${error.message}`,
      error.statusCode,
      error.retryable,
    );
  }
  return new BriefGeminiApiError(
    `Brief Gemini request failed: ${errorMessage(error)}`,
    undefined,
    true,
  );
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
