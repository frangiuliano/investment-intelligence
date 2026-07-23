import { ConfigService } from '@nestjs/config';
import { KnowledgePackService } from '../knowledge/knowledge-pack.service';
import { LlmApiError } from '../llm/llm.errors';
import type { LlmClient } from '../llm/llm.port';
import { BriefGeminiClient } from './brief-gemini.client';
import {
  BRIEF_GEMINI_TIMEOUT_MS,
  BRIEF_MAX_OUTPUT_TOKENS,
  BRIEF_PROMPT_VERSION,
} from './brief.constants';

describe('BriefGeminiClient', () => {
  function createClient(
    completeJson: jest.Mock,
    buildInjection: jest.Mock = jest.fn().mockResolvedValue({
      knowledgeVersion: '0.1.0',
      injection: {
        knowledgeVersion: '0.1.0',
        matchedIds: ['equity', 'stance-invalidation'],
        markdown: '### playbook: equity\n## Always check\n- Check thesis.',
        truncated: false,
      },
    }),
  ): BriefGeminiClient {
    const llmClient: LlmClient = { completeJson };
    return new BriefGeminiClient(
      {
        getOrThrow: (key: string) => {
          if (key === 'locale') {
            return 'en';
          }
          throw new Error(`Unexpected config key: ${key}`);
        },
      } as unknown as ConfigService,
      llmClient,
      { buildInjection } as unknown as KnowledgePackService,
    );
  }

  it('posts via the LLM port and parses sections with stance', async () => {
    const completeJson = jest.fn().mockResolvedValue({
      text: JSON.stringify({
        overview: 'o',
        fundamental: 'f',
        technical: 't',
        risks: 'r',
        invalidation: 'i',
        disclaimer: 'd',
        stance: 'watch',
        stance_rationale: 'Range-bound',
      }),
      provider: 'gemini',
      model: 'gemini-test',
    });

    const client = createClient(completeJson);
    const result = await client.generateBrief({
      symbol: 'AAPL',
      holding: null,
      marketFacts: 'Market facts (source=yahoo):\nlastClose=100',
    });

    expect(result.sections.overview).toBe('o');
    expect(result.stance).toBe('watch');
    expect(result.stanceRationale).toBe('Range-bound');
    expect(result.knowledgeVersion).toBe('0.1.0');
    expect(completeJson).toHaveBeenCalledTimes(1);
    const [request] = completeJson.mock.calls[0] as [
      {
        system: string;
        temperature: number;
        maxOutputTokens: number;
        timeoutMs: number;
        schemaVersion: string;
      },
    ];
    expect(request.system).toContain('stance');
    expect(request.system).toContain('## Knowledge Pack');
    expect(request.system).toContain('## Always check');
    expect(request.temperature).toBe(0.3);
    expect(request.maxOutputTokens).toBe(BRIEF_MAX_OUTPUT_TOKENS);
    expect(request.timeoutMs).toBe(BRIEF_GEMINI_TIMEOUT_MS);
    expect(request.schemaVersion).toBe(BRIEF_PROMPT_VERSION);
  });

  it('maps non-OK LLM errors to BriefGeminiApiError', async () => {
    const completeJson = jest
      .fn()
      .mockRejectedValue(
        new LlmApiError('Gemini API 500: server error', 500, true),
      );

    const client = createClient(completeJson);
    await expect(
      client.generateBrief({
        symbol: 'AAPL',
        holding: null,
        marketFacts: null,
      }),
    ).rejects.toMatchObject({
      name: 'BriefGeminiApiError',
      statusCode: 500,
      retryable: true,
    });
  });
});
