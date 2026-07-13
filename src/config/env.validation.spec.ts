import {
  DEFAULT_APP_LOCALE,
  DEFAULT_COLLECTION_CRON_SCHEDULE,
  DEFAULT_GEMINI_ANALYSIS_BATCH_SIZE,
  DEFAULT_GEMINI_MODEL,
  DEFAULT_GEMINI_REQUEST_DELAY_MS,
  envValidationSchema,
  parseWatchlistTickers,
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
  APP_LOCALE: string;
  COLLECTION_CRON_SCHEDULE: string;
  GEMINI_REQUEST_DELAY_MS: number;
  GEMINI_MODEL: string;
  GEMINI_ANALYSIS_BATCH_SIZE: number;
};

describe('envValidationSchema', () => {
  it('accepts a valid runtime env and applies defaults', () => {
    const result = envValidationSchema.validate(validEnv);
    const value = result.value as ValidatedEnv;

    expect(result.error).toBeUndefined();
    expect(value.PORT).toBe(3000);
    expect(value.APP_LOCALE).toBe(DEFAULT_APP_LOCALE);
    expect(value.COLLECTION_CRON_SCHEDULE).toBe(
      DEFAULT_COLLECTION_CRON_SCHEDULE,
    );
    expect(value.GEMINI_REQUEST_DELAY_MS).toBe(DEFAULT_GEMINI_REQUEST_DELAY_MS);
    expect(value.GEMINI_MODEL).toBe(DEFAULT_GEMINI_MODEL);
    expect(value.GEMINI_ANALYSIS_BATCH_SIZE).toBe(
      DEFAULT_GEMINI_ANALYSIS_BATCH_SIZE,
    );
  });

  it('accepts APP_LOCALE=en and APP_LOCALE=es', () => {
    for (const locale of ['en', 'es', 'EN', ' Es ']) {
      const result = envValidationSchema.validate({
        ...validEnv,
        APP_LOCALE: locale,
      });
      const value = result.value as ValidatedEnv;

      expect(result.error).toBeUndefined();
      expect(value.APP_LOCALE).toBe(locale.trim().toLowerCase());
    }
  });

  it('rejects an unsupported APP_LOCALE with an explicit message', () => {
    const { error } = envValidationSchema.validate({
      ...validEnv,
      APP_LOCALE: 'fr',
    });

    expect(error).toBeDefined();
    expect(error?.message).toContain('APP_LOCALE');
    expect(error?.message).toContain('en');
    expect(error?.message).toContain('es');
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

  it('rejects whitespace-only required secrets', () => {
    const { error } = envValidationSchema.validate({
      ...validEnv,
      GEMINI_API_KEY_FINANCE: '   ',
      TELEGRAM_BOT_TOKEN: '\t',
      TELEGRAM_CHAT_ID: '  ',
    });

    expect(error).toBeDefined();
    expect(error?.message).toMatch(
      /GEMINI_API_KEY_FINANCE|TELEGRAM_BOT_TOKEN|TELEGRAM_CHAT_ID/,
    );
  });

  it('rejects RSS_FEED_URLS with only commas or whitespace', () => {
    for (const rssFeedUrls of [',', ', ,', '   ', '\t,\n']) {
      const { error } = envValidationSchema.validate({
        ...validEnv,
        RSS_FEED_URLS: rssFeedUrls,
      });

      expect(error).toBeDefined();
      expect(error?.message).toContain('RSS_FEED_URLS');
    }
  });

  it('accepts comma-separated RSS feeds with surrounding whitespace', () => {
    const { error } = envValidationSchema.validate({
      ...validEnv,
      RSS_FEED_URLS: ' https://a.example/rss , https://b.example/rss ',
    });

    expect(error).toBeUndefined();
  });

  it('rejects GEMINI_ANALYSIS_BATCH_SIZE above 50', () => {
    const { error } = envValidationSchema.validate({
      ...validEnv,
      GEMINI_ANALYSIS_BATCH_SIZE: 51,
    });

    expect(error).toBeDefined();
    expect(error?.message).toContain('GEMINI_ANALYSIS_BATCH_SIZE');
  });

  it('accepts optional WATCHLIST_TICKERS', () => {
    const { error } = envValidationSchema.validate({
      ...validEnv,
      WATCHLIST_TICKERS: 'AAPL, MSFT',
    });

    expect(error).toBeUndefined();
  });
});

describe('parseWatchlistTickers', () => {
  it('returns empty list when unset or blank', () => {
    expect(parseWatchlistTickers(undefined)).toEqual([]);
    expect(parseWatchlistTickers('')).toEqual([]);
    expect(parseWatchlistTickers('  ,  ')).toEqual([]);
  });

  it('normalizes, trims, and deduplicates tickers', () => {
    expect(parseWatchlistTickers(' aapl , MSFT,AAPL ')).toEqual([
      'AAPL',
      'MSFT',
    ]);
  });
});
