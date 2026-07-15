import { Inject, Injectable } from '@nestjs/common';
import { MarketDataUnavailableError } from './market-data.errors';
import { MARKET_DATA_PORT } from './market-data.port';
import type { MarketDataPort } from './market-data.port';
import { MarketDataTimeframe, MarketSeries } from './market-data.types';

const VALID_SYMBOL = /^[A-Z0-9^][A-Z0-9.^=-]{0,19}$/;

@Injectable()
export class MarketDataService {
  constructor(
    @Inject(MARKET_DATA_PORT)
    private readonly marketDataPort: MarketDataPort,
  ) {}

  async getSeries(
    rawSymbol: string,
    timeframe: MarketDataTimeframe = '1d',
  ): Promise<MarketSeries> {
    const symbol = rawSymbol.trim().toUpperCase();
    if (!VALID_SYMBOL.test(symbol)) {
      throw new MarketDataUnavailableError(
        symbol,
        'invalid_symbol',
        'Market data symbol must contain 1-20 supported ticker characters',
      );
    }

    return this.marketDataPort.getSeries(symbol, timeframe);
  }
}
