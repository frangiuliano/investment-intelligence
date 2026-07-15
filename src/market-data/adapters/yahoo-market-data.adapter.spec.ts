import { ConfigService } from '@nestjs/config';
import { YahooMarketDataAdapter } from './yahoo-market-data.adapter';

function mockResponse(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: jest.fn().mockResolvedValue(body),
  } as unknown as Response;
}

describe('YahooMarketDataAdapter', () => {
  const originalFetch = global.fetch;
  let adapter: YahooMarketDataAdapter;

  beforeEach(() => {
    const configService = {
      getOrThrow: jest.fn().mockReturnValue(10_000),
    } as unknown as ConfigService;
    adapter = new YahooMarketDataAdapter(configService);
  });

  afterEach(() => {
    jest.useRealTimers();
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it('maps complete Yahoo chart rows to the market data contract', async () => {
    global.fetch = jest.fn().mockResolvedValue(
      mockResponse(200, {
        chart: {
          result: [
            {
              meta: { symbol: 'AAPL' },
              timestamp: [1_752_451_200, 1_752_537_600],
              indicators: {
                quote: [
                  {
                    open: [210, null],
                    high: [215, null],
                    low: [209, null],
                    close: [214, null],
                    volume: [12_000_000, null],
                  },
                ],
              },
            },
          ],
          error: null,
        },
      }),
    );

    const result = await adapter.getSeries('AAPL', '1d');

    expect(result).toEqual({
      symbol: 'AAPL',
      timeframe: '1d',
      bars: [
        {
          time: '2025-07-14',
          open: 210,
          high: 215,
          low: 209,
          close: 214,
          volume: 12_000_000,
        },
      ],
      asOf: expect.any(String) as string,
      source: 'yahoo-finance-chart',
    });
    expect(global.fetch).toHaveBeenCalledWith(
      expect.objectContaining({
        hostname: 'query1.finance.yahoo.com',
        pathname: '/v8/finance/chart/AAPL',
      }),
      expect.objectContaining({
        method: 'GET',
        signal: expect.any(AbortSignal) as AbortSignal,
      }),
    );
  });

  it('returns a typed not-found error for unknown symbols', async () => {
    global.fetch = jest.fn().mockResolvedValue(
      mockResponse(200, {
        chart: {
          result: null,
          error: {
            code: 'Not Found',
            description: 'No data found, symbol may be delisted',
          },
        },
      }),
    );

    await expect(adapter.getSeries('UNKNOWN', '1d')).rejects.toMatchObject({
      name: 'MarketDataUnavailableError',
      reason: 'not_found',
      symbol: 'UNKNOWN',
    });
  });

  it('rejects responses without complete OHLCV bars', async () => {
    global.fetch = jest.fn().mockResolvedValue(
      mockResponse(200, {
        chart: {
          result: [
            {
              timestamp: [1_752_451_200],
              indicators: {
                quote: [
                  {
                    open: [null],
                    high: [null],
                    low: [null],
                    close: [null],
                    volume: [null],
                  },
                ],
              },
            },
          ],
          error: null,
        },
      }),
    );

    await expect(adapter.getSeries('AAPL', '1d')).rejects.toMatchObject({
      reason: 'invalid_response',
    });
  });

  it('maps aborted requests to a typed timeout error', async () => {
    const abortError = new Error('aborted');
    abortError.name = 'AbortError';
    global.fetch = jest.fn().mockRejectedValue(abortError);

    await expect(adapter.getSeries('AAPL', '1d')).rejects.toMatchObject({
      reason: 'timeout',
      symbol: 'AAPL',
    });
  });

  it('times out when the provider response body never completes', async () => {
    jest.useFakeTimers();
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: jest.fn().mockReturnValue(new Promise(() => undefined)),
    });

    const request = adapter.getSeries('AAPL', '1d');
    const expectation = expect(request).rejects.toMatchObject({
      reason: 'timeout',
      symbol: 'AAPL',
    });
    await Promise.resolve();
    await jest.advanceTimersByTimeAsync(10_000);

    await expectation;
  });

  it('maps provider HTTP failures without exposing a response body', async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValue(mockResponse(503, { internal: 'provider details' }));

    await expect(adapter.getSeries('AAPL', '1d')).rejects.toMatchObject({
      reason: 'provider_error',
      statusCode: 503,
      message: 'Yahoo market data request failed with HTTP 503',
    });
  });
});
