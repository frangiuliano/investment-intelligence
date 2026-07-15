import { ConfigService } from '@nestjs/config';
import { BriefGeminiClient } from './brief-gemini.client';

describe('BriefGeminiClient', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.useRealTimers();
  });

  function createClient(): BriefGeminiClient {
    return new BriefGeminiClient({
      getOrThrow: (key: string) => {
        const values: Record<string, string> = {
          'gemini.apiKeyFinance': 'finance-key',
          'gemini.model': 'gemini-test',
          locale: 'en',
        };
        return values[key];
      },
    } as unknown as ConfigService);
  }

  it('posts a JSON brief request and parses sections', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          candidates: [
            {
              content: {
                parts: [
                  {
                    text: JSON.stringify({
                      overview: 'o',
                      fundamental: 'f',
                      technical: 't',
                      risks: 'r',
                      invalidation: 'i',
                      disclaimer: 'd',
                    }),
                  },
                ],
              },
            },
          ],
        }),
    });
    global.fetch = fetchMock;

    const client = createClient();
    const sections = await client.generateBrief({
      symbol: 'AAPL',
      holding: null,
    });

    expect(sections.overview).toBe('o');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(typeof init.body).toBe('string');
    const body = JSON.parse(init.body as string) as {
      systemInstruction: { parts: Array<{ text: string }> };
      generationConfig: { responseMimeType: string };
    };
    expect(body.systemInstruction.parts[0].text).toContain('educational');
    expect(body.generationConfig.responseMimeType).toBe('application/json');
  });

  it('throws on non-OK Gemini responses', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 500,
      headers: { get: () => null },
      text: () => Promise.resolve('server error'),
    });

    const client = createClient();
    await expect(
      client.generateBrief({ symbol: 'AAPL', holding: null }),
    ).rejects.toThrow(/Brief Gemini API 500/);
  });
});
