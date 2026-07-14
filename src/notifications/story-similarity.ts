import { DEFAULT_STORY_CLUSTER_WINDOW_HOURS } from '../config/env.validation';

export { DEFAULT_STORY_CLUSTER_WINDOW_HOURS };
export const DEFAULT_STORY_SIMILARITY_THRESHOLD = 0.35;

const SOFT_EVENT_TYPES = new Set(['none', 'other']);

export type StoryCandidate = {
  articleId: string;
  title: string;
  summary: string;
  tickers: string[];
  eventType: string;
  referenceAt: Date;
};

export type StorySimilarityOptions = {
  windowHours?: number;
  similarityThreshold?: number;
};

export function tokenizeForSimilarity(text: string): Set<string> {
  const tokens = text
    .toLowerCase()
    .replace(/[^a-z0-9À-ÿ\s]/gi, ' ')
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 2);

  return new Set(tokens);
}

export function jaccardSimilarity(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) {
    return 0;
  }

  let intersection = 0;
  for (const token of a) {
    if (b.has(token)) {
      intersection += 1;
    }
  }

  const union = a.size + b.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

export function normalizeTickers(tickers: string[]): string[] {
  const seen = new Set<string>();
  const normalized: string[] = [];

  for (const ticker of tickers) {
    const value = ticker.trim().toUpperCase();
    if (!value || seen.has(value)) {
      continue;
    }
    seen.add(value);
    normalized.push(value);
  }

  return normalized;
}

export function hasTickerOverlap(left: string[], right: string[]): boolean {
  const rightSet = new Set(normalizeTickers(right));
  return normalizeTickers(left).some((ticker) => rightSet.has(ticker));
}

export function eventTypesCompatible(left: string, right: string): boolean {
  const a = left.trim().toLowerCase();
  const b = right.trim().toLowerCase();

  if (a === b) {
    return true;
  }

  return SOFT_EVENT_TYPES.has(a) && SOFT_EVENT_TYPES.has(b);
}

export function withinStoryWindow(
  left: Date,
  right: Date,
  windowHours: number,
): boolean {
  const diffMs = Math.abs(left.getTime() - right.getTime());
  return diffMs <= windowHours * 60 * 60 * 1000;
}

export function areSameStory(
  left: StoryCandidate,
  right: StoryCandidate,
  options: StorySimilarityOptions = {},
): boolean {
  const windowHours = options.windowHours ?? DEFAULT_STORY_CLUSTER_WINDOW_HOURS;
  const threshold =
    options.similarityThreshold ?? DEFAULT_STORY_SIMILARITY_THRESHOLD;

  if (left.articleId === right.articleId) {
    return true;
  }

  if (!withinStoryWindow(left.referenceAt, right.referenceAt, windowHours)) {
    return false;
  }

  if (!hasTickerOverlap(left.tickers, right.tickers)) {
    return false;
  }

  if (!eventTypesCompatible(left.eventType, right.eventType)) {
    return false;
  }

  const titleScore = jaccardSimilarity(
    tokenizeForSimilarity(left.title),
    tokenizeForSimilarity(right.title),
  );
  const summaryScore = jaccardSimilarity(
    tokenizeForSimilarity(left.summary),
    tokenizeForSimilarity(right.summary),
  );

  return titleScore >= threshold || summaryScore >= threshold;
}

export function resolveStoryReferenceAt(input: {
  publishedAt?: Date | null;
  analyzedAt: Date;
}): Date {
  return input.publishedAt ?? input.analyzedAt;
}
