export type AssetSuggestion = {
  symbol: string;
  name: string;
  assetType: string | null;
  exchange: string | null;
  prioritized: boolean;
};

export type AssetSuggestResult = {
  items: AssetSuggestion[];
  source: string;
};

export type ProviderAssetCandidate = {
  symbol: string;
  name: string;
  assetType: string | null;
  exchange: string | null;
};
