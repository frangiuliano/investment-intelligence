import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { AppLocale } from '../config/env.validation';
import { ANALYSIS_PROMPT_VERSION } from '../knowledge/knowledge.constants';
import { KnowledgePackService } from '../knowledge/knowledge-pack.service';
import { LlmApiError } from '../llm/llm.errors';
import { LLM_CLIENT } from '../llm/llm.port';
import { GEMINI_REQUEST_TIMEOUT_MS } from './gemini.constants';
import { GeminiApiError, GeminiClient } from './gemini.client';

describe('GeminiClient', () => {
  let client: GeminiClient;
  let completeJson: jest.Mock;
  let buildInjection: jest.Mock;
  let locale: AppLocale;

  beforeEach(async () => {
    completeJson = jest.fn();
    buildInjection = jest.fn().mockResolvedValue({
      knowledgeVersion: '0.1.0',
      injection: {
        knowledgeVersion: '0.1.0',
        matchedIds: ['equity', 'materiality', 'event-types'],
        markdown:
          '### playbook: equity\n## Always check\n- Identify primary ticker(s).',
        truncated: false,
      },
    });
    locale = 'en';

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GeminiClient,
        {
          provide: ConfigService,
          useValue: {
            getOrThrow: jest.fn((key: string) => {
              if (key === 'locale') {
                return locale;
              }
              throw new Error(`Unexpected config key: ${key}`);
            }),
          },
        },
        {
          provide: LLM_CLIENT,
          useValue: { completeJson },
        },
        {
          provide: KnowledgePackService,
          useValue: { buildInjection },
        },
      ],
    }).compile();

    client = module.get(GeminiClient);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should call the LLM port and parse JSON analysis', async () => {
    completeJson.mockResolvedValue({
      text: JSON.stringify({
        headline: 'Oil prices fall on inventories',
        summary: 'Oil prices fell.',
        sentiment: 'negative',
        tickers: ['XOM'],
        materiality: 'medium',
        event_type: 'none',
      }),
      provider: 'gemini',
      model: 'gemini-test',
    });

    const result = await client.analyzeArticle({
      title: 'Oil slides',
      source: 'Example',
      url: 'https://news.example.com/oil',
      content: 'Crude fell on inventory data.',
    });

    expect(result).toEqual({
      headline: 'Oil prices fall on inventories',
      summary: 'Oil prices fell.',
      sentiment: 'negative',
      tickers: ['XOM'],
      materiality: 'medium',
      eventType: 'none',
      promptVersion: ANALYSIS_PROMPT_VERSION,
      knowledgeVersion: '0.1.0',
    });

    expect(buildInjection).toHaveBeenCalledWith({
      useCase: 'news-analysis',
      textHints: 'Oil slides\nCrude fell on inventory data.',
    });
    expect(completeJson).toHaveBeenCalledTimes(1);
    const [request] = completeJson.mock.calls[0] as [
      {
        system: string;
        user: string;
        temperature: number;
        maxOutputTokens: number;
        timeoutMs: number;
        schemaVersion: string;
      },
    ];
    expect(request.system).toContain(
      'Write the summary and headline in English.',
    );
    expect(request.system).toContain('## Knowledge Pack');
    expect(request.system).toContain('## Always check');
    expect(request.user).toContain('Oil slides');
    expect(request.temperature).toBe(0.2);
    expect(request.maxOutputTokens).toBe(1024);
    expect(request.timeoutMs).toBe(GEMINI_REQUEST_TIMEOUT_MS);
    expect(request.schemaVersion).toBe(ANALYSIS_PROMPT_VERSION);
  });

  it('should degrade without knowledge injection when pack is unavailable', async () => {
    buildInjection.mockResolvedValue({
      injection: null,
      knowledgeVersion: null,
    });
    completeJson.mockResolvedValue({
      text: JSON.stringify({
        headline: 'Oil prices fall on inventories',
        summary: 'Oil prices fell.',
        sentiment: 'negative',
        tickers: ['XOM'],
        materiality: 'medium',
        event_type: 'none',
      }),
      provider: 'gemini',
      model: 'gemini-test',
    });

    const result = await client.analyzeArticle({
      title: 'Oil slides',
      source: 'Example',
      url: 'https://news.example.com/oil',
      content: 'Crude fell on inventory data.',
    });

    expect(result.knowledgeVersion).toBeNull();
    const [request] = completeJson.mock.calls[0] as [{ system: string }];
    expect(request.system).not.toContain('## Knowledge Pack');
  });

  it('should not persist knowledgeVersion when injection is null even if version is reported', async () => {
    buildInjection.mockResolvedValue({
      injection: null,
      knowledgeVersion: '0.1.0',
    });
    completeJson.mockResolvedValue({
      text: JSON.stringify({
        headline: 'Oil prices fall on inventories',
        summary: 'Oil prices fell.',
        sentiment: 'negative',
        tickers: ['XOM'],
        materiality: 'medium',
        event_type: 'none',
      }),
      provider: 'gemini',
      model: 'gemini-test',
    });

    const result = await client.analyzeArticle({
      title: 'Oil slides',
      source: 'Example',
      url: 'https://news.example.com/oil',
      content: null,
    });

    expect(result.knowledgeVersion).toBeNull();
  });

  it('should instruct Spanish summary and headline when APP_LOCALE is es', async () => {
    locale = 'es';
    completeJson.mockResolvedValue({
      text: JSON.stringify({
        headline: 'El petróleo baja por inventarios',
        summary: 'El petróleo bajó.',
        sentiment: 'negative',
        tickers: ['XOM'],
        materiality: 'high',
        event_type: 'none',
      }),
      provider: 'gemini',
      model: 'gemini-test',
    });

    await client.analyzeArticle({
      title: 'Oil slides',
      source: 'Example',
      url: 'https://news.example.com/oil',
      content: 'Crude fell on inventory data.',
    });

    const [request] = completeJson.mock.calls[0] as [{ system: string }];
    expect(request.system).toContain(
      'Write the summary and headline in Spanish.',
    );
  });

  it('should map a retryable LlmApiError to GeminiApiError on HTTP 429', async () => {
    completeJson.mockRejectedValue(
      new LlmApiError('Gemini API 429: quota', 429, true, 5000),
    );

    await expect(
      client.analyzeArticle({
        title: 't',
        source: 's',
        url: 'https://news.example.com/x',
        content: 'c',
      }),
    ).rejects.toEqual(
      expect.objectContaining({
        name: 'GeminiApiError',
        statusCode: 429,
        retryable: true,
        retryAfterMs: 5000,
      } satisfies Partial<GeminiApiError>),
    );
  });

  it('should throw a non-retryable GeminiApiError on invalid JSON schema', async () => {
    completeJson.mockResolvedValue({
      text: JSON.stringify({ summary: 'only' }),
      provider: 'gemini',
      model: 'gemini-test',
    });

    try {
      await client.analyzeArticle({
        title: 't',
        source: 's',
        url: 'https://news.example.com/x',
        content: 'c',
      });
      fail('expected analyzeArticle to reject');
    } catch (error) {
      expect(error).toBeInstanceOf(GeminiApiError);
      const geminiError = error as GeminiApiError;
      expect(geminiError.retryable).toBe(false);
      expect(geminiError.message).toContain('Gemini response parse failed');
    }
  });
});
