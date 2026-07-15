import { MarketDataTimeframe, MarketSeries } from './market-data.types';

export const MARKET_DATA_PORT = Symbol('MARKET_DATA_PORT');

export interface MarketDataPort {
  getSeries(
    symbol: string,
    timeframe: MarketDataTimeframe,
  ): Promise<MarketSeries>;
}
