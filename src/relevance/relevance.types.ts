export type RelevanceInput = {
  sentiment: string;
  tickers: string[];
  materiality: string;
  alreadyNotified: boolean;
};

export type RelevanceResult = {
  isRelevant: boolean;
  reason: string;
};
