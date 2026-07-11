import {
  DEFAULT_COLLECTION_CRON_SCHEDULE,
  DEFAULT_GEMINI_ANALYSIS_BATCH_SIZE,
  DEFAULT_GEMINI_MODEL,
  DEFAULT_GEMINI_REQUEST_DELAY_MS,
  parseFeedUrls,
} from './env.validation';

export type AppConfig = {
  port: number;
  databaseUrl: string;
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
};

export default (): AppConfig => ({
  port: parseInt(process.env.PORT ?? '3000', 10),
  databaseUrl: process.env.DATABASE_URL as string,
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
});
