import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { AppLocale } from '../config/env.validation';
import {
  GEMINI_FLASH_MODEL,
  GEMINI_REQUEST_TIMEOUT_MS,
} from './gemini.constants';
import { GeminiApiError, GeminiClient } from './gemini.client';

describe('GeminiClient', () => {
  let client: GeminiClient;
  let fetchMock: jest.Mock;
  let locale: AppLocale;

  beforeEach(async () => {
    fetchMock = jest.fn();
    global.fetch = fetchMock;
    locale = 'en';

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GeminiClient,
        {
          provide: ConfigService,
          useValue: {
            getOrThrow: jest.fn((key: string) => {
              if (key === 'gemini.apiKeyFinance') {
                return 'test-finance-key';
              }
              if (key === 'gemini.model') {
                return GEMINI_FLASH_MODEL;
              }
              if (key === 'locale') {
                return locale;
              }
              throw new Error(`Unexpected config key: ${key}`);
            }),
          },
        },
      ],
    }).compile();

    client = module.get(GeminiClient);
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('should call Gemini Flash with finance API key and parse JSON', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          candidates: [
            {
              content: {
                parts: [
                  {
                    text: JSON.stringify({
                      summary: 'Oil prices fell.',
                      sentiment: 'negative',
                      tickers: ['XOM'],
                      materiality: 'medium',
                      event_type: 'none',
                    }),
                  },
                ],
              },
            },
          ],
        }),
    });

    const result = await client.analyzeArticle({
      title: 'Oil slides',
      source: 'Example',
      url: 'https://news.example.com/oil',
      content: 'Crude fell on inventory data.',
    });

    expect(result).toEqual({
      summary: 'Oil prices fell.',
      sentiment: 'negative',
      tickers: ['XOM'],
      materiality: 'medium',
      eventType: 'none',
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain(`models/${GEMINI_FLASH_MODEL}:generateContent`);
    expect(options.headers).toMatchObject({
      'x-goog-api-key': 'test-finance-key',
    });
    expect(typeof options.body).toBe('string');
    const body = JSON.parse(options.body as string) as {
      systemInstruction: { parts: Array<{ text: string }> };
      generationConfig: { responseMimeType: string };
    };
    expect(body.generationConfig.responseMimeType).toBe('application/json');
    expect(body.systemInstruction.parts[0]?.text).toContain(
      'Write the summary in English.',
    );
  });

  it('should instruct Spanish summary when APP_LOCALE is es', async () => {
    locale = 'es';
    fetchMock.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          candidates: [
            {
              content: {
                parts: [
                  {
                    text: JSON.stringify({
                      summary: 'El petróleo bajó.',
                      sentiment: 'negative',
                      tickers: ['XOM'],
                      materiality: 'high',
                      event_type: 'none',
                    }),
                  },
                ],
              },
            },
          ],
        }),
    });

    await client.analyzeArticle({
      title: 'Oil slides',
      source: 'Example',
      url: 'https://news.example.com/oil',
      content: 'Crude fell on inventory data.',
    });

    const [, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(options.body as string) as {
      systemInstruction: { parts: Array<{ text: string }> };
    };
    expect(body.systemInstruction.parts[0]?.text).toContain(
      'Write the summary in Spanish.',
    );
  });

  it('should throw a retryable GeminiApiError on HTTP 429', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 429,
      headers: {
        get: (name: string) => (name === 'retry-after' ? '5' : null),
      },
      text: () =>
        Promise.resolve('Please retry in 5.2s. Quota exceeded for free tier'),
    });

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
    fetchMock.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          candidates: [
            {
              content: {
                parts: [{ text: JSON.stringify({ summary: 'only' }) }],
              },
            },
          ],
        }),
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

  it('should time out when response body never resolves', async () => {
    jest.useFakeTimers();
    fetchMock.mockResolvedValue({
      ok: true,
      json: () => new Promise(() => undefined),
    });

    const pending = client.analyzeArticle({
      title: 'hang',
      source: 'Example',
      url: 'https://news.example.com/hang',
      content: 'body',
    });
    const expectation = expect(pending).rejects.toThrow(
      /Gemini request timed out after/,
    );

    await jest.advanceTimersByTimeAsync(GEMINI_REQUEST_TIMEOUT_MS);
    await expectation;
  });
});
