import { MarketDataUnavailableError } from './market-data.errors';
import { MarketDataPort } from './market-data.port';
import { MarketDataService } from './market-data.service';
import { MarketSeries } from './market-data.types';

describe('MarketDataService', () => {
  const series: MarketSeries = {
    symbol: 'AAPL',
    timeframe: '1d',
    bars: [
      {
        time: '2026-07-14',
        open: 210,
        high: 215,
        low: 209,
        close: 214,
        volume: 12_000_000,
      },
    ],
    asOf: '2026-07-15T12:00:00.000Z',
    source: 'test-provider',
  };
  let port: jest.Mocked<MarketDataPort>;
  let getSeries: jest.MockedFunction<MarketDataPort['getSeries']>;
  let service: MarketDataService;

  beforeEach(() => {
    getSeries = jest.fn().mockResolvedValue(series);
    port = {
      getSeries,
    };
    service = new MarketDataService(port);
  });

  it('normalizes the symbol and requests daily bars', async () => {
    await expect(service.getSeries(' aapl ')).resolves.toEqual(series);
    expect(getSeries).toHaveBeenCalledWith('AAPL', '1d');
  });

  it.each(['', '../secret', 'AAPL/../../', 'AAPL USD', 'A'.repeat(21)])(
    'rejects unsupported symbol %p without calling the provider',
    async (symbol) => {
      await expect(service.getSeries(symbol)).rejects.toMatchObject({
        name: 'MarketDataUnavailableError',
        reason: 'invalid_symbol',
      } satisfies Partial<MarketDataUnavailableError>);
      expect(getSeries).not.toHaveBeenCalled();
    },
  );

  it('propagates typed provider failures', async () => {
    const error = new MarketDataUnavailableError(
      'UNKNOWN',
      'not_found',
      'Ticker not found',
    );
    getSeries.mockRejectedValue(error);

    await expect(service.getSeries('UNKNOWN')).rejects.toBe(error);
  });
});
