import {
  DEFAULT_PLAYBOOK_ASSET_TYPE,
  KNOWN_PLAYBOOK_ASSET_TYPES,
  KnownPlaybookAssetType,
} from './knowledge.constants';
import { KnowledgeSelectQuery } from './knowledge.types';

const ASSET_TYPE_KEYWORDS: Record<KnownPlaybookAssetType, RegExp[]> = {
  cedear: [/\bcedears?\b/i, /\bcedear\b/i],
  bond: [
    /\bbonds?\b/i,
    /\btreasury\b/i,
    /\bbonos?\b/i,
    /\bfixed[\s-]?income\b/i,
  ],
  equity: [
    /\bequities\b/i,
    /\bstocks?\b/i,
    /\bshares?\b/i,
    /\bcommon stock\b/i,
  ],
};

/**
 * Resolve which playbook assetType to load. Explicit metadata wins, then
 * keyword hints, then the equity default (issue #83).
 */
export function resolvePlaybookAssetType(
  query: KnowledgeSelectQuery,
): KnownPlaybookAssetType {
  const fromExplicit = firstKnownAssetType(query.assetTypes);
  if (fromExplicit) {
    return fromExplicit;
  }

  const fromHints = matchAssetTypeFromText(query.textHints);
  if (fromHints) {
    return fromHints;
  }

  return DEFAULT_PLAYBOOK_ASSET_TYPE;
}

export function selectRubricIds(query: KnowledgeSelectQuery): string[] {
  if (query.useCase === 'news-analysis') {
    return ['materiality', 'event-types'];
  }

  const ids: string[] = [];
  if (query.includeStanceRubric) {
    ids.push('stance-invalidation');
  }
  return ids;
}

function firstKnownAssetType(
  assetTypes: string[] | undefined,
): KnownPlaybookAssetType | null {
  if (!assetTypes?.length) {
    return null;
  }
  for (const raw of assetTypes) {
    const normalized = raw.trim().toLowerCase();
    if (
      (KNOWN_PLAYBOOK_ASSET_TYPES as readonly string[]).includes(normalized)
    ) {
      return normalized as KnownPlaybookAssetType;
    }
  }
  return null;
}

function matchAssetTypeFromText(
  text: string | undefined,
): KnownPlaybookAssetType | null {
  if (!text?.trim()) {
    return null;
  }
  // Prefer more specific asset classes before the broad equity keywords.
  for (const assetType of ['cedear', 'bond', 'equity'] as const) {
    if (ASSET_TYPE_KEYWORDS[assetType].some((re) => re.test(text))) {
      return assetType;
    }
  }
  return null;
}
