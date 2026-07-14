export type RelevanceInput = {
  sentiment: string;
  tickers: string[];
  materiality: string;
  /** Catalyst taxonomy from Gemini; missing/invalid treated as `none`. */
  eventType?: string;
  alreadyNotified: boolean;
  /** When set (including empty), overrides env/persisted resolution. */
  watchlistTickers?: string[];
};

export type RelevanceResult = {
  isRelevant: boolean;
  reason: string;
};
