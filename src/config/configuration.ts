import {
  DEFAULT_COLLECTION_CRON_SCHEDULE,
  DEFAULT_GEMINI_REQUEST_DELAY_MS,
} from './env.validation';

export type AppConfig = {
  port: number;
  databaseUrl: string;
  gemini: {
    apiKeyFinance: string;
    requestDelayMs: number;
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

function parseFeedUrls(raw: string | undefined): string[] {
  if (!raw) {
    return [];
  }

  return raw
    .split(',')
    .map((url) => url.trim())
    .filter((url) => url.length > 0);
}

export default (): AppConfig => ({
  port: parseInt(process.env.PORT ?? '3000', 10),
  databaseUrl: process.env.DATABASE_URL as string,
  gemini: {
    apiKeyFinance: process.env.GEMINI_API_KEY_FINANCE as string,
    requestDelayMs: parseInt(
      process.env.GEMINI_REQUEST_DELAY_MS ??
        String(DEFAULT_GEMINI_REQUEST_DELAY_MS),
      10,
    ),
  },
  telegram: {
    botToken: process.env.TELEGRAM_BOT_TOKEN as string,
    chatId: process.env.TELEGRAM_CHAT_ID as string,
  },
  rss: {
    feedUrls: parseFeedUrls(process.env.RSS_FEED_URLS),
  },
  collection: {
    cronSchedule:
      process.env.COLLECTION_CRON_SCHEDULE ?? DEFAULT_COLLECTION_CRON_SCHEDULE,
  },
});
