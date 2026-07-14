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

export type BriefHoldingContext = {
  symbol: string;
  assetTypes: string[];
  notes: string | null;
};

export type BriefHoldingLookup = BriefHoldingContext & {
  holdingId: string;
};
