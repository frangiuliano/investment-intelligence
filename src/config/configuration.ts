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
  DEFAULT_KNOWLEDGE_CONTEXT_MAX_CHARS,
  DEFAULT_KNOWLEDGE_ROOT,
  DEFAULT_LLM_PROVIDER,
  DEFAULT_MARKET_DATA_PROVIDER,
  DEFAULT_MARKET_DATA_TIMEOUT_MS,
  LlmProvider,
  DEFAULT_REVIEW_CRON_SCHEDULE,
  DEFAULT_STORY_CLUSTER_WINDOW_HOURS,
  DEFAULT_TECHNICAL_CHART_ENABLED,
  DEFAULT_TECHNICAL_CHART_MAX_BARS,
  parseFeedUrls,
  parseSmaPeriods,
  parseTelegramAllowedUserIds,
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

function resolveTechnicalChartEnabled(raw: string | undefined): boolean {
  const normalized = raw?.trim().toLowerCase();
  if (!normalized) {
    return DEFAULT_TECHNICAL_CHART_ENABLED;
  }
  return normalized !== 'false' && normalized !== '0';
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
    webhookSecret: string;
    allowedUserIds: string[];
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
  marketData: {
    provider: typeof DEFAULT_MARKET_DATA_PROVIDER;
    timeoutMs: number;
  };
  llm: {
    provider: LlmProvider;
  };
  knowledge: {
    root: string;
    maxContextChars: number;
  };
  dashboard: {
    apiKey: string;
  };
  review: {
    cronSchedule: string;
  };
  technicalChart: {
    enabled: boolean;
    smaPeriods: number[];
    maxBars: number;
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
    webhookSecret: (process.env.TELEGRAM_WEBHOOK_SECRET ?? '').trim(),
    allowedUserIds: parseTelegramAllowedUserIds(
      process.env.TELEGRAM_ALLOWED_USER_IDS,
    ),
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
  marketData: {
    provider: (process.env.MARKET_DATA_PROVIDER?.trim().toLowerCase() ||
      DEFAULT_MARKET_DATA_PROVIDER) as typeof DEFAULT_MARKET_DATA_PROVIDER,
    timeoutMs: parseInt(
      process.env.MARKET_DATA_TIMEOUT_MS ??
        String(DEFAULT_MARKET_DATA_TIMEOUT_MS),
      10,
    ),
  },
  llm: {
    provider: (process.env.LLM_PROVIDER?.trim().toLowerCase() ||
      DEFAULT_LLM_PROVIDER) as LlmProvider,
  },
  knowledge: {
    root: process.env.KNOWLEDGE_ROOT?.trim() || DEFAULT_KNOWLEDGE_ROOT,
    maxContextChars: parseInt(
      process.env.KNOWLEDGE_CONTEXT_MAX_CHARS ??
        String(DEFAULT_KNOWLEDGE_CONTEXT_MAX_CHARS),
      10,
    ),
  },
  dashboard: {
    apiKey: (process.env.DASHBOARD_API_KEY ?? '').trim(),
  },
  review: {
    cronSchedule:
      process.env.REVIEW_CRON_SCHEDULE?.trim() ?? DEFAULT_REVIEW_CRON_SCHEDULE,
  },
  technicalChart: {
    enabled: resolveTechnicalChartEnabled(process.env.TECHNICAL_CHART_ENABLED),
    smaPeriods: parseSmaPeriods(process.env.TECHNICAL_CHART_SMA_PERIODS),
    maxBars: parseInt(
      process.env.TECHNICAL_CHART_MAX_BARS ??
        String(DEFAULT_TECHNICAL_CHART_MAX_BARS),
      10,
    ),
  },
});
