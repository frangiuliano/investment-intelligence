import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import {
  GEMINI_FLASH_MODEL,
  GEMINI_REQUEST_TIMEOUT_MS,
} from './gemini.constants';
import { GeminiApiError, GeminiClient } from './gemini.client';

describe('GeminiClient', () => {
  let client: GeminiClient;
  let fetchMock: jest.Mock;

  beforeEach(async () => {
    fetchMock = jest.fn();
    global.fetch = fetchMock;

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
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain(`models/${GEMINI_FLASH_MODEL}:generateContent`);
    expect(options.headers).toMatchObject({
      'x-goog-api-key': 'test-finance-key',
    });
    expect(typeof options.body).toBe('string');
    const body = JSON.parse(options.body as string) as {
      generationConfig: { responseMimeType: string };
    };
    expect(body.generationConfig.responseMimeType).toBe('application/json');
  });

  it('should throw a retryable GeminiApiError on HTTP 429', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 429,
      text: () => Promise.resolve('rate limited'),
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
      } satisfies Partial<GeminiApiError>),
    );
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
