import { ConfigService } from '@nestjs/config';
import { GeminiLlmAdapter } from './gemini-llm.adapter';
import { LlmApiError } from '../llm.errors';

describe('GeminiLlmAdapter', () => {
  let adapter: GeminiLlmAdapter;
  let fetchMock: jest.Mock;

  beforeEach(() => {
    fetchMock = jest.fn();
    global.fetch = fetchMock;
    adapter = new GeminiLlmAdapter({
      getOrThrow: (key: string) => {
        const values: Record<string, string> = {
          'gemini.apiKeyFinance': 'test-finance-key',
          'gemini.model': 'gemini-test-model',
        };
        const value = values[key];
        if (value === undefined) {
          throw new Error(`Unexpected config key: ${key}`);
        }
        return value;
      },
    } as unknown as ConfigService);
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('calls Gemini generateContent and returns JSON text', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          candidates: [
            {
              content: {
                parts: [{ text: '{"summary":"ok"}' }],
              },
            },
          ],
        }),
    });

    const result = await adapter.completeJson({
      system: 'system prompt',
      user: 'user prompt',
      temperature: 0.1,
      maxOutputTokens: 256,
    });

    expect(result).toEqual({
      text: '{"summary":"ok"}',
      provider: 'gemini',
      model: 'gemini-test-model',
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('models/gemini-test-model:generateContent');
    expect(options.headers).toMatchObject({
      'x-goog-api-key': 'test-finance-key',
    });
    const body = JSON.parse(options.body as string) as {
      systemInstruction: { parts: Array<{ text: string }> };
      contents: Array<{ parts: Array<{ text: string }> }>;
      generationConfig: {
        temperature: number;
        maxOutputTokens: number;
        responseMimeType: string;
      };
    };
    expect(body.systemInstruction.parts[0].text).toBe('system prompt');
    expect(body.contents[0].parts[0].text).toBe('user prompt');
    expect(body.generationConfig).toEqual({
      temperature: 0.1,
      maxOutputTokens: 256,
      responseMimeType: 'application/json',
    });
  });

  it('throws a retryable LlmApiError on HTTP 429 with Retry-After', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 429,
      headers: {
        get: (name: string) => (name === 'retry-after' ? '5' : null),
      },
      text: () => Promise.resolve('Please retry in 5.2s'),
    });

    await expect(
      adapter.completeJson({ system: 's', user: 'u' }),
    ).rejects.toEqual(
      expect.objectContaining({
        name: 'LlmApiError',
        statusCode: 429,
        retryable: true,
        retryAfterMs: 5000,
      } satisfies Partial<LlmApiError>),
    );
  });

  it('times out when the response body never resolves', async () => {
    jest.useFakeTimers();
    fetchMock.mockResolvedValue({
      ok: true,
      json: () => new Promise(() => undefined),
    });

    const pending = adapter.completeJson({
      system: 's',
      user: 'u',
      timeoutMs: 1000,
    });
    const expectation = expect(pending).rejects.toThrow(
      /Gemini request timed out after 1000ms/,
    );

    await jest.advanceTimersByTimeAsync(1000);
    await expectation;
  });
});
