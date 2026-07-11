export const GEMINI_FLASH_MODEL = 'gemini-2.0-flash';

export const MAX_PROMPT_CONTENT_LENGTH = 8_000;
export const MAX_SUMMARY_LENGTH = 4_000;
export const GEMINI_REQUEST_TIMEOUT_MS = 30_000;
export const GEMINI_MAX_RETRIES = 3;
export const GEMINI_BACKOFF_BASE_MS = 1_000;

export const SENTIMENT_VALUES = ['positive', 'negative', 'neutral'] as const;
export type Sentiment = (typeof SENTIMENT_VALUES)[number];
