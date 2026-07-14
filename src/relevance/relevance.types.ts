export type RelevanceInput = {
  sentiment: string;
  tickers: string[];
  materiality: string;
  alreadyNotified: boolean;
  /** When set (including empty), overrides env/persisted resolution. */
  watchlistTickers?: string[];
};

export type RelevanceResult = {
  isRelevant: boolean;
  reason: string;
};
