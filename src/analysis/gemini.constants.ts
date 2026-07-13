export { DEFAULT_GEMINI_MODEL } from '../config/env.validation';
import { DEFAULT_GEMINI_MODEL } from '../config/env.validation';

/** @deprecated Prefer config `gemini.model`; kept for tests/docs. */
export const GEMINI_FLASH_MODEL = DEFAULT_GEMINI_MODEL;

export const MAX_PROMPT_CONTENT_LENGTH = 8_000;
export const MAX_SUMMARY_LENGTH = 4_000;
export const GEMINI_REQUEST_TIMEOUT_MS = 30_000;
export const GEMINI_MAX_RETRIES = 3;
export const GEMINI_BACKOFF_BASE_MS = 1_000;
export const GEMINI_MAX_RETRY_AFTER_MS = 60_000;

export const SENTIMENT_VALUES = ['positive', 'negative', 'neutral'] as const;
export type Sentiment = (typeof SENTIMENT_VALUES)[number];

export const MATERIALITY_VALUES = ['low', 'medium', 'high'] as const;
export type Materiality = (typeof MATERIALITY_VALUES)[number];

/** Materiality levels that can trigger a push alert (with other relevance rules). */
export const ALERTABLE_MATERIALITY_VALUES = ['medium', 'high'] as const;
