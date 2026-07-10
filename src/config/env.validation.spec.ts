import {
  DEFAULT_COLLECTION_CRON_SCHEDULE,
  DEFAULT_GEMINI_REQUEST_DELAY_MS,
  envValidationSchema,
} from './env.validation';

const validEnv = {
  DATABASE_URL:
    'postgresql://postgres:postgres@localhost:5432/investment_intelligence',
  GEMINI_API_KEY_FINANCE: 'finance-key',
  TELEGRAM_BOT_TOKEN: 'bot-token',
  TELEGRAM_CHAT_ID: '123456',
  RSS_FEED_URLS: 'https://example.com/rss',
};

type ValidatedEnv = {
  PORT: number;
  COLLECTION_CRON_SCHEDULE: string;
  GEMINI_REQUEST_DELAY_MS: number;
};

describe('envValidationSchema', () => {
  it('accepts a valid runtime env and applies defaults', () => {
    const result = envValidationSchema.validate(validEnv);
    const value = result.value as ValidatedEnv;

    expect(result.error).toBeUndefined();
    expect(value.PORT).toBe(3000);
    expect(value.COLLECTION_CRON_SCHEDULE).toBe(
      DEFAULT_COLLECTION_CRON_SCHEDULE,
    );
    expect(value.GEMINI_REQUEST_DELAY_MS).toBe(DEFAULT_GEMINI_REQUEST_DELAY_MS);
  });

  it('does not require GEMINI_API_KEY_REVIEWER at boot', () => {
    const { error } = envValidationSchema.validate(validEnv);

    expect(error).toBeUndefined();
  });

  it('fails with a clear message when a required variable is missing', () => {
    const { error } = envValidationSchema.validate({
      DATABASE_URL: validEnv.DATABASE_URL,
      TELEGRAM_BOT_TOKEN: validEnv.TELEGRAM_BOT_TOKEN,
      TELEGRAM_CHAT_ID: validEnv.TELEGRAM_CHAT_ID,
      RSS_FEED_URLS: validEnv.RSS_FEED_URLS,
    });

    expect(error).toBeDefined();
    expect(error?.message).toContain('GEMINI_API_KEY_FINANCE');
  });

  it('rejects an empty required secret', () => {
    const { error } = envValidationSchema.validate({
      ...validEnv,
      TELEGRAM_BOT_TOKEN: '',
    });

    expect(error).toBeDefined();
    expect(error?.message).toContain('TELEGRAM_BOT_TOKEN');
  });
});
