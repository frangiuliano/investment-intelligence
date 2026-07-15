export const MARKET_DATA_TIMEFRAMES = ['1d'] as const;

export type MarketDataTimeframe = (typeof MARKET_DATA_TIMEFRAMES)[number];

export type OhlcvBar = {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

export type MarketSeries = {
  symbol: string;
  timeframe: MarketDataTimeframe;
  bars: OhlcvBar[];
  asOf: string;
  source: string;
};
