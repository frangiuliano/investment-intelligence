import {
  ALLOWED_APP_LOCALES,
  AppLocale,
  DEFAULT_APP_LOCALE,
  DEFAULT_COLLECTION_CRON_SCHEDULE,
  DEFAULT_GEMINI_ANALYSIS_BATCH_SIZE,
  DEFAULT_GEMINI_MODEL,
  DEFAULT_GEMINI_REQUEST_DELAY_MS,
  DEFAULT_DIGEST_CRON_SCHEDULE,
  DEFAULT_DIGEST_LOOKBACK_HOURS,
  DEFAULT_STORY_CLUSTER_WINDOW_HOURS,
  parseFeedUrls,
  parseWatchlistTickers,
} from './env.validation';

function resolveAppLocale(raw: string | undefined): AppLocale {
  const normalized = raw?.trim().toLowerCase();
  if (!normalized) {
    return DEFAULT_APP_LOCALE;
  }

  if ((ALLOWED_APP_LOCALES as readonly string[]).includes(normalized)) {
    return normalized as AppLocale;
  }

  return DEFAULT_APP_LOCALE;
}

export type AppConfig = {
  port: number;
  databaseUrl: string;
  locale: AppLocale;
  gemini: {
    apiKeyFinance: string;
    model: string;
    requestDelayMs: number;
    analysisBatchSize: number;
  };
  telegram: {
    botToken: string;
    chatId: string;
  };
  rss: {
    feedUrls: string[];
  };
  collection: {
    cronSchedule: string;
  };
  watchlist: {
    tickers: string[];
  };
  storyCluster: {
    windowHours: number;
  };
  digest: {
    cronSchedule: string;
    lookbackHours: number;
  };
};

export default (): AppConfig => ({
  port: parseInt(process.env.PORT ?? '3000', 10),
  databaseUrl: process.env.DATABASE_URL as string,
  locale: resolveAppLocale(process.env.APP_LOCALE),
  gemini: {
    apiKeyFinance: (process.env.GEMINI_API_KEY_FINANCE ?? '').trim(),
    model: process.env.GEMINI_MODEL?.trim() || DEFAULT_GEMINI_MODEL,
    requestDelayMs: parseInt(
      process.env.GEMINI_REQUEST_DELAY_MS ??
        String(DEFAULT_GEMINI_REQUEST_DELAY_MS),
      10,
    ),
    analysisBatchSize: parseInt(
      process.env.GEMINI_ANALYSIS_BATCH_SIZE ??
        String(DEFAULT_GEMINI_ANALYSIS_BATCH_SIZE),
      10,
    ),
  },
  telegram: {
    botToken: (process.env.TELEGRAM_BOT_TOKEN ?? '').trim(),
    chatId: (process.env.TELEGRAM_CHAT_ID ?? '').trim(),
  },
  rss: {
    feedUrls: parseFeedUrls(process.env.RSS_FEED_URLS),
  },
  collection: {
    cronSchedule:
      process.env.COLLECTION_CRON_SCHEDULE?.trim() ??
      DEFAULT_COLLECTION_CRON_SCHEDULE,
  },
  watchlist: {
    tickers: parseWatchlistTickers(process.env.WATCHLIST_TICKERS),
  },
  storyCluster: {
    windowHours: parseInt(
      process.env.STORY_CLUSTER_WINDOW_HOURS ??
        String(DEFAULT_STORY_CLUSTER_WINDOW_HOURS),
      10,
    ),
  },
  digest: {
    cronSchedule:
      process.env.DIGEST_CRON_SCHEDULE?.trim() ?? DEFAULT_DIGEST_CRON_SCHEDULE,
    lookbackHours: parseInt(
      process.env.DIGEST_LOOKBACK_HOURS ??
        String(DEFAULT_DIGEST_LOOKBACK_HOURS),
      10,
    ),
  },
});
