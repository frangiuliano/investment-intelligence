import {
  DEFAULT_KNOWLEDGE_CONTEXT_MAX_CHARS,
  DEFAULT_KNOWLEDGE_ROOT,
} from '../config/env.validation';

export { DEFAULT_KNOWLEDGE_CONTEXT_MAX_CHARS, DEFAULT_KNOWLEDGE_ROOT };
export const ANALYSIS_PROMPT_VERSION = 'news-analysis-v2';
export const KNOWN_PLAYBOOK_ASSET_TYPES = ['equity', 'cedear', 'bond'] as const;
export type KnownPlaybookAssetType =
  (typeof KNOWN_PLAYBOOK_ASSET_TYPES)[number];
export const DEFAULT_PLAYBOOK_ASSET_TYPE: KnownPlaybookAssetType = 'equity';
