import { ConfigService } from '@nestjs/config';
import { YahooAssetSuggestAdapter } from './yahoo-asset-suggest.adapter';

function mockResponse(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: jest.fn().mockResolvedValue(body),
  } as unknown as Response;
}

describe('YahooAssetSuggestAdapter', () => {
  const originalFetch = global.fetch;
  let adapter: YahooAssetSuggestAdapter;

  beforeEach(() => {
    const configService = {
      getOrThrow: jest.fn().mockReturnValue(10_000),
    } as unknown as ConfigService;
    adapter = new YahooAssetSuggestAdapter(configService);
  });

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it('maps Yahoo equity/ETF quotes and skips unsupported types', async () => {
    global.fetch = jest.fn().mockResolvedValue(
      mockResponse(200, {
        quotes: [
          {
            symbol: 'AAPL',
            shortname: 'Apple Inc.',
            longname: 'Apple Inc.',
            quoteType: 'EQUITY',
            exchange: 'NMS',
            exchDisp: 'NASDAQ',
          },
          {
            symbol: 'AAP',
            shortname: 'Advance Auto Parts Inc.',
            quoteType: 'EQUITY',
            exchange: 'NYQ',
            exchDisp: 'NYSE',
          },
          {
            symbol: '0P0000CRAW.L',
            shortname: 'Fund',
            quoteType: 'MUTUALFUND',
            exchange: 'LSE',
          },
          {
            symbol: 'QQQ',
            shortname: 'Invesco QQQ Trust',
            quoteType: 'ETF',
            exchange: 'NMS',
            exchDisp: 'NASDAQ',
          },
        ],
      }),
    );

    await expect(adapter.suggest('AAP')).resolves.toEqual([
      {
        symbol: 'AAPL',
        name: 'Apple Inc.',
        assetType: 'equity',
        exchange: 'NASDAQ',
      },
      {
        symbol: 'AAP',
        name: 'Advance Auto Parts Inc.',
        assetType: 'equity',
        exchange: 'NYSE',
      },
      {
        symbol: 'QQQ',
        name: 'Invesco QQQ Trust',
        assetType: 'etf',
        exchange: 'NASDAQ',
      },
    ]);

    expect(global.fetch).toHaveBeenCalledWith(
      expect.objectContaining({
        hostname: 'query1.finance.yahoo.com',
        pathname: '/v1/finance/search',
      }),
      expect.objectContaining({
        method: 'GET',
        signal: expect.any(AbortSignal) as AbortSignal,
      }),
    );
  });

  it('returns an empty list when Yahoo has no quotes', async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValue(mockResponse(200, { quotes: [] }));

    await expect(adapter.suggest('ZZZZNOPE')).resolves.toEqual([]);
  });

  it('throws when Yahoo returns a non-OK status', async () => {
    global.fetch = jest.fn().mockResolvedValue(mockResponse(500, {}));

    await expect(adapter.suggest('AAPL')).rejects.toMatchObject({
      name: 'AssetSuggestUnavailableError',
      reason: 'provider_error',
    });
  });

  it('throws when Yahoo payload is invalid', async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValue(mockResponse(200, { quotes: null }));

    await expect(adapter.suggest('AAPL')).rejects.toMatchObject({
      name: 'AssetSuggestUnavailableError',
      reason: 'invalid_response',
    });
  });
});
