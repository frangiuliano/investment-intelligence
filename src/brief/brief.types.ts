import { MarketSeries } from '../market-data/market-data.types';

export const BRIEF_SECTION_KEYS = [
  'overview',
  'fundamental',
  'technical',
  'risks',
  'invalidation',
  'disclaimer',
] as const;

export type BriefSectionKey = (typeof BRIEF_SECTION_KEYS)[number];

export type BriefSections = Record<BriefSectionKey, string>;

export const BRIEF_STANCES_NO_HOLDING = ['enter', 'avoid', 'watch'] as const;
export const BRIEF_STANCES_WITH_HOLDING = [
  'hold',
  'add',
  'reduce',
  'exit',
] as const;

export type BriefStanceNoHolding = (typeof BRIEF_STANCES_NO_HOLDING)[number];
export type BriefStanceWithHolding =
  (typeof BRIEF_STANCES_WITH_HOLDING)[number];
export type BriefStance = BriefStanceNoHolding | BriefStanceWithHolding;

export type BriefHoldingContext = {
  symbol: string;
  assetTypes: string[];
  notes: string | null;
};

export type BriefHoldingLookup = BriefHoldingContext & {
  holdingId: string;
};

export type BriefGenerationResult = {
  sections: BriefSections;
  stance: BriefStance | null;
  stanceRationale: string | null;
};

export type BriefMarketContext = {
  factsBlock: string;
  asOf: Date;
  source: string;
  series: MarketSeries;
};
