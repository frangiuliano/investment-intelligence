import * as Joi from 'joi';

export const DEFAULT_COLLECTION_CRON_SCHEDULE = '*/15 * * * *';
export const DEFAULT_GEMINI_REQUEST_DELAY_MS = 1000;

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
  GEMINI_API_KEY_FINANCE: Joi.string().min(1).required().messages({
    'any.required':
      'GEMINI_API_KEY_FINANCE is required (Google AI Studio project B — news analysis)',
    'string.min': 'GEMINI_API_KEY_FINANCE must not be empty',
  }),
  GEMINI_API_KEY_REVIEWER: Joi.string().optional().allow(''),
  TELEGRAM_BOT_TOKEN: Joi.string().min(1).required().messages({
    'any.required': 'TELEGRAM_BOT_TOKEN is required',
    'string.min': 'TELEGRAM_BOT_TOKEN must not be empty',
  }),
  TELEGRAM_CHAT_ID: Joi.string().min(1).required().messages({
    'any.required': 'TELEGRAM_CHAT_ID is required',
    'string.min': 'TELEGRAM_CHAT_ID must not be empty',
  }),
  RSS_FEED_URLS: Joi.string().min(1).required().messages({
    'any.required':
      'RSS_FEED_URLS is required (comma-separated list of feed URLs)',
    'string.min': 'RSS_FEED_URLS must not be empty',
  }),
  COLLECTION_CRON_SCHEDULE: Joi.string()
    .min(1)
    .default(DEFAULT_COLLECTION_CRON_SCHEDULE),
  GEMINI_REQUEST_DELAY_MS: Joi.number()
    .integer()
    .min(0)
    .default(DEFAULT_GEMINI_REQUEST_DELAY_MS),
});
