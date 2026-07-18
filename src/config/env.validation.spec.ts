import {
  DEFAULT_APP_LOCALE,
  DEFAULT_COLLECTION_CRON_SCHEDULE,
  DEFAULT_DIGEST_CRON_SCHEDULE,
  DEFAULT_DIGEST_LOOKBACK_HOURS,
  DEFAULT_GEMINI_ANALYSIS_BATCH_SIZE,
  DEFAULT_GEMINI_MODEL,
  DEFAULT_GEMINI_REQUEST_DELAY_MS,
  DEFAULT_MARKET_DATA_PROVIDER,
  DEFAULT_MARKET_DATA_TIMEOUT_MS,
  DEFAULT_REVIEW_CRON_SCHEDULE,
  DEFAULT_STORY_CLUSTER_WINDOW_HOURS,
  DEFAULT_TECHNICAL_CHART_ENABLED,
  DEFAULT_TECHNICAL_CHART_MAX_BARS,
  envValidationSchema,
  parseSmaPeriods,
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
  STORY_CLUSTER_WINDOW_HOURS: number;
  DIGEST_CRON_SCHEDULE: string;
  DIGEST_LOOKBACK_HOURS: number;
  MARKET_DATA_PROVIDER: string;
  MARKET_DATA_TIMEOUT_MS: number;
  DASHBOARD_API_KEY: string;
  REVIEW_CRON_SCHEDULE: string;
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
    expect(value.STORY_CLUSTER_WINDOW_HOURS).toBe(
      DEFAULT_STORY_CLUSTER_WINDOW_HOURS,
    );
    expect(value.DIGEST_CRON_SCHEDULE).toBe(DEFAULT_DIGEST_CRON_SCHEDULE);
    expect(value.DIGEST_LOOKBACK_HOURS).toBe(DEFAULT_DIGEST_LOOKBACK_HOURS);
    expect(value.MARKET_DATA_PROVIDER).toBe(DEFAULT_MARKET_DATA_PROVIDER);
    expect(value.MARKET_DATA_TIMEOUT_MS).toBe(DEFAULT_MARKET_DATA_TIMEOUT_MS);
    expect(value.DASHBOARD_API_KEY).toBe('');
    expect(value.REVIEW_CRON_SCHEDULE).toBe(DEFAULT_REVIEW_CRON_SCHEDULE);
    expect(
      (result.value as ValidatedEnv & { TELEGRAM_WEBHOOK_SECRET: string })
        .TELEGRAM_WEBHOOK_SECRET,
    ).toBe('');
  });

  it('accepts an optional TELEGRAM_WEBHOOK_SECRET', () => {
    const result = envValidationSchema.validate({
      ...validEnv,
      TELEGRAM_WEBHOOK_SECRET: '  webhook-secret  ',
    });

    expect(result.error).toBeUndefined();
    expect(
      (result.value as { TELEGRAM_WEBHOOK_SECRET: string })
        .TELEGRAM_WEBHOOK_SECRET,
    ).toBe('webhook-secret');
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

  it('rejects unsupported market data providers', () => {
    const { error } = envValidationSchema.validate({
      ...validEnv,
      MARKET_DATA_PROVIDER: 'unknown',
    });

    expect(error).toBeDefined();
    expect(error?.message).toContain('MARKET_DATA_PROVIDER');
  });

  it('rejects market data timeouts outside the supported range', () => {
    for (const timeout of [999, 30_001]) {
      const { error } = envValidationSchema.validate({
        ...validEnv,
        MARKET_DATA_TIMEOUT_MS: timeout,
      });

      expect(error).toBeDefined();
      expect(error?.message).toContain('MARKET_DATA_TIMEOUT_MS');
    }
  });

  it('applies technical chart defaults', () => {
    const result = envValidationSchema.validate(validEnv);
    const value = result.value as ValidatedEnv & {
      TECHNICAL_CHART_ENABLED: boolean;
      TECHNICAL_CHART_MAX_BARS: number;
    };

    expect(result.error).toBeUndefined();
    expect(value.TECHNICAL_CHART_ENABLED).toBe(DEFAULT_TECHNICAL_CHART_ENABLED);
    expect(value.TECHNICAL_CHART_MAX_BARS).toBe(
      DEFAULT_TECHNICAL_CHART_MAX_BARS,
    );
  });

  it('accepts TECHNICAL_CHART_ENABLED=false and comma-separated SMA periods', () => {
    const { error } = envValidationSchema.validate({
      ...validEnv,
      TECHNICAL_CHART_ENABLED: 'false',
      TECHNICAL_CHART_SMA_PERIODS: '20, 50',
    });

    expect(error).toBeUndefined();
  });

  it('rejects TECHNICAL_CHART_SMA_PERIODS without any valid period', () => {
    const { error } = envValidationSchema.validate({
      ...validEnv,
      TECHNICAL_CHART_SMA_PERIODS: 'abc, -5, 0',
    });

    expect(error).toBeDefined();
    expect(error?.message).toContain('TECHNICAL_CHART_SMA_PERIODS');
  });

  it('rejects TECHNICAL_CHART_MAX_BARS outside the supported range', () => {
    for (const maxBars of [4, 366]) {
      const { error } = envValidationSchema.validate({
        ...validEnv,
        TECHNICAL_CHART_MAX_BARS: maxBars,
      });

      expect(error).toBeDefined();
      expect(error?.message).toContain('TECHNICAL_CHART_MAX_BARS');
    }
  });
});

describe('parseSmaPeriods', () => {
  it('falls back to the default when unset or blank', () => {
    expect(parseSmaPeriods(undefined)).toEqual([20]);
    expect(parseSmaPeriods('')).toEqual([20]);
  });

  it('parses, trims, and deduplicates positive integer periods', () => {
    expect(parseSmaPeriods(' 20 , 50, 20 ')).toEqual([20, 50]);
  });

  it('ignores invalid entries', () => {
    expect(parseSmaPeriods('abc, -5, 0, 10')).toEqual([10]);
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
