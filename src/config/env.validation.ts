import * as Joi from 'joi';

export const DEFAULT_COLLECTION_CRON_SCHEDULE = '*/15 * * * *';
/** ~5 RPM free-tier friendly spacing between article analyses. */
export const DEFAULT_GEMINI_REQUEST_DELAY_MS = 12_000;
/** Prefer Flash-Lite: usually higher free-tier RPM than 3.5 Flash. */
export const DEFAULT_GEMINI_MODEL = 'gemini-3.1-flash-lite';
/** Cap articles processed per analyzePending() run on free tier. */
export const DEFAULT_GEMINI_ANALYSIS_BATCH_SIZE = 5;
/** Output language for analysis summaries and alerts (one locale per deploy). */
export const DEFAULT_APP_LOCALE = 'en' as const;
export const ALLOWED_APP_LOCALES = ['en', 'es'] as const;
export type AppLocale = (typeof ALLOWED_APP_LOCALES)[number];
/** Hours within which matching stories collapse to one push alert. */
export const DEFAULT_STORY_CLUSTER_WINDOW_HOURS = 24;
/** Daily noon UTC — low-urgency digest, separate from the pipeline cron. */
export const DEFAULT_DIGEST_CRON_SCHEDULE = '0 12 * * *';
/** Lookback window for digest candidates (hours). Use 168 + weekly cron for weekly digests. */
export const DEFAULT_DIGEST_LOOKBACK_HOURS = 24;
export const DEFAULT_MARKET_DATA_PROVIDER = 'yahoo' as const;
export const DEFAULT_MARKET_DATA_TIMEOUT_MS = 10_000;
/** LLM provider for news analysis and briefs (vendor-agnostic port). */
export const DEFAULT_LLM_PROVIDER = 'gemini' as const;
export const ALLOWED_LLM_PROVIDERS = [DEFAULT_LLM_PROVIDER] as const;
export type LlmProvider = (typeof ALLOWED_LLM_PROVIDERS)[number];
/** First day of each month at 12:00 UTC — period review of hypotheses. */
export const DEFAULT_REVIEW_CRON_SCHEDULE = '0 12 1 * *';
/** Technical chart follow-up for briefs (ADR 004). */
export const DEFAULT_TECHNICAL_CHART_ENABLED = true;
export const DEFAULT_TECHNICAL_CHART_SMA_PERIODS = '20';
export const DEFAULT_TECHNICAL_CHART_MAX_BARS = 90;

export function parseFeedUrls(raw: string | undefined): string[] {
  if (!raw) {
    return [];
  }

  return raw
    .split(',')
    .map((url) => url.trim())
    .filter((url) => url.length > 0);
}

export function parseWatchlistTickers(raw: string | undefined): string[] {
  if (!raw) {
    return [];
  }

  const seen = new Set<string>();
  const tickers: string[] = [];

  for (const part of raw.split(',')) {
    const ticker = part.trim().toUpperCase();
    if (!ticker || seen.has(ticker)) {
      continue;
    }
    seen.add(ticker);
    tickers.push(ticker);
  }

  return tickers;
}

/** Comma-separated SMA window sizes (positive integers, deduplicated). */
export function parseSmaPeriods(raw: string | undefined): number[] {
  const source =
    raw && raw.trim() !== '' ? raw : DEFAULT_TECHNICAL_CHART_SMA_PERIODS;

  const seen = new Set<number>();
  const periods: number[] = [];
  for (const part of source.split(',')) {
    const trimmed = part.trim();
    if (!/^\d+$/.test(trimmed)) {
      continue;
    }
    const period = parseInt(trimmed, 10);
    if (period < 1 || seen.has(period)) {
      continue;
    }
    seen.add(period);
    periods.push(period);
  }
  return periods;
}

/** Comma-separated Telegram user ids (positive integers as strings). */
export function parseTelegramAllowedUserIds(raw: string | undefined): string[] {
  if (!raw) {
    return [];
  }

  const seen = new Set<string>();
  const ids: string[] = [];
  for (const part of raw.split(',')) {
    const id = part.trim();
    if (!id || !/^\d+$/.test(id) || seen.has(id)) {
      continue;
    }
    seen.add(id);
    ids.push(id);
  }
  return ids;
}

const requiredSecret = (name: string) =>
  Joi.string()
    .trim()
    .min(1)
    .required()
    .messages({
      'any.required': `${name} is required`,
      'string.min': `${name} must not be empty`,
    });

export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),
  PORT: Joi.number().port().default(3000),
  DATABASE_URL: Joi.string()
    .pattern(/^postgres(ql)?:\/\//)
    .required()
    .messages({
      'any.required': 'DATABASE_URL is required',
      'string.pattern.base':
        'DATABASE_URL must be a PostgreSQL connection string',
    }),
  GEMINI_API_KEY_FINANCE: Joi.string().trim().min(1).required().messages({
    'any.required':
      'GEMINI_API_KEY_FINANCE is required (Google AI Studio project B — news analysis)',
    'string.min': 'GEMINI_API_KEY_FINANCE must not be empty',
  }),
  GEMINI_API_KEY_REVIEWER: Joi.string().optional().allow(''),
  TELEGRAM_BOT_TOKEN: requiredSecret('TELEGRAM_BOT_TOKEN'),
  TELEGRAM_CHAT_ID: requiredSecret('TELEGRAM_CHAT_ID'),
  /** Required for POST /telegram/webhook; leave empty to disable inbound webhook. */
  TELEGRAM_WEBHOOK_SECRET: Joi.string().trim().allow('').optional().default(''),
  /**
   * Optional allowlist of Telegram user ids for inbound commands.
   * Empty = any member of TELEGRAM_CHAT_ID (groups still rejected by id < 0).
   */
  TELEGRAM_ALLOWED_USER_IDS: Joi.string().optional().allow(''),
  RSS_FEED_URLS: Joi.string()
    .required()
    .custom((value: string, helpers) => {
      if (parseFeedUrls(value).length === 0) {
        return helpers.error('rss.noFeeds');
      }
      return value;
    })
    .messages({
      'any.required':
        'RSS_FEED_URLS is required (comma-separated list of feed URLs)',
      'rss.noFeeds':
        'RSS_FEED_URLS must include at least one non-empty feed URL',
    }),
  COLLECTION_CRON_SCHEDULE: Joi.string()
    .trim()
    .min(1)
    .default(DEFAULT_COLLECTION_CRON_SCHEDULE),
  GEMINI_REQUEST_DELAY_MS: Joi.number()
    .integer()
    .min(0)
    .default(DEFAULT_GEMINI_REQUEST_DELAY_MS),
  GEMINI_MODEL: Joi.string().trim().min(1).default(DEFAULT_GEMINI_MODEL),
  GEMINI_ANALYSIS_BATCH_SIZE: Joi.number()
    .integer()
    .min(1)
    .max(50)
    .default(DEFAULT_GEMINI_ANALYSIS_BATCH_SIZE),
  WATCHLIST_TICKERS: Joi.string().optional().allow(''),
  APP_LOCALE: Joi.string()
    .trim()
    .lowercase()
    .valid(...ALLOWED_APP_LOCALES)
    .default(DEFAULT_APP_LOCALE)
    .messages({
      'any.only': `APP_LOCALE must be one of: ${ALLOWED_APP_LOCALES.join(', ')}`,
    }),
  STORY_CLUSTER_WINDOW_HOURS: Joi.number()
    .integer()
    .min(1)
    .max(168)
    .default(DEFAULT_STORY_CLUSTER_WINDOW_HOURS),
  DIGEST_CRON_SCHEDULE: Joi.string()
    .trim()
    .min(1)
    .default(DEFAULT_DIGEST_CRON_SCHEDULE),
  DIGEST_LOOKBACK_HOURS: Joi.number()
    .integer()
    .min(1)
    .max(168)
    .default(DEFAULT_DIGEST_LOOKBACK_HOURS),
  MARKET_DATA_PROVIDER: Joi.string()
    .trim()
    .lowercase()
    .valid(DEFAULT_MARKET_DATA_PROVIDER)
    .default(DEFAULT_MARKET_DATA_PROVIDER),
  MARKET_DATA_TIMEOUT_MS: Joi.number()
    .integer()
    .min(1_000)
    .max(30_000)
    .default(DEFAULT_MARKET_DATA_TIMEOUT_MS),
  /**
   * Vendor-agnostic LLM provider selected by LlmModule.
   * Only `gemini` is wired today; other values fail validation at boot.
   */
  LLM_PROVIDER: Joi.string()
    .trim()
    .lowercase()
    .valid(...ALLOWED_LLM_PROVIDERS)
    .default(DEFAULT_LLM_PROVIDER)
    .messages({
      'any.only': `LLM_PROVIDER must be one of: ${ALLOWED_LLM_PROVIDERS.join(', ')}`,
    }),
  /**
   * Shared secret for dashboard-facing Nest routes (BFF header
   * x-dashboard-api-key). Empty disables those routes (401).
   */
  DASHBOARD_API_KEY: Joi.string().trim().allow('').optional().default(''),
  REVIEW_CRON_SCHEDULE: Joi.string()
    .trim()
    .min(1)
    .default(DEFAULT_REVIEW_CRON_SCHEDULE),
  TECHNICAL_CHART_ENABLED: Joi.boolean().default(
    DEFAULT_TECHNICAL_CHART_ENABLED,
  ),
  TECHNICAL_CHART_SMA_PERIODS: Joi.string()
    .optional()
    .allow('')
    .custom((value: string, helpers) => {
      if (parseSmaPeriods(value).length === 0) {
        return helpers.error('technicalChart.noPeriods');
      }
      return value;
    })
    .messages({
      'technicalChart.noPeriods':
        'TECHNICAL_CHART_SMA_PERIODS must include at least one positive integer (e.g. "20" or "20,50")',
    }),
  TECHNICAL_CHART_MAX_BARS: Joi.number()
    .integer()
    .min(5)
    .max(365)
    .default(DEFAULT_TECHNICAL_CHART_MAX_BARS),
});
