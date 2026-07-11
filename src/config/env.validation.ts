import * as Joi from 'joi';

export const DEFAULT_COLLECTION_CRON_SCHEDULE = '*/15 * * * *';
/** ~5 RPM free-tier friendly spacing between article analyses. */
export const DEFAULT_GEMINI_REQUEST_DELAY_MS = 12_000;
/** Prefer Flash-Lite: usually higher free-tier RPM than 3.5 Flash. */
export const DEFAULT_GEMINI_MODEL = 'gemini-3.1-flash-lite';
/** Cap articles processed per analyzePending() run on free tier. */
export const DEFAULT_GEMINI_ANALYSIS_BATCH_SIZE = 5;

export function parseFeedUrls(raw: string | undefined): string[] {
  if (!raw) {
    return [];
  }

  return raw
    .split(',')
    .map((url) => url.trim())
    .filter((url) => url.length > 0);
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
});
