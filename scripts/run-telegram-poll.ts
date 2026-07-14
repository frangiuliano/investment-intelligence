/**
 * Local long-polling fallback when HTTPS webhook is unavailable.
 * Usage: npm run telegram:poll
 *
 * Requires TELEGRAM_BOT_TOKEN + TELEGRAM_CHAT_ID. Does not need
 * TELEGRAM_WEBHOOK_SECRET. Delete any webhook first:
 *   curl "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/deleteWebhook"
 */
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { AppModule } from '../src/app.module';
import { CommandRouterService } from '../src/telegram-bot/command-router.service';
import { TelegramUpdate } from '../src/telegram-bot/telegram-command';

const POLL_TIMEOUT_SECONDS = 25;

async function main() {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  const config = app.get(ConfigService);
  const botToken = config.getOrThrow<string>('telegram.botToken');
  const router = app.get(CommandRouterService);
  let offset = 0;

  // eslint-disable-next-line no-console
  console.log('Telegram long polling started (Ctrl+C to stop)');

  try {
    for (;;) {
      const url = new URL(
        `https://api.telegram.org/bot${botToken}/getUpdates`,
      );
      url.searchParams.set('timeout', String(POLL_TIMEOUT_SECONDS));
      url.searchParams.set('offset', String(offset));

      const response = await fetch(url);
      if (!response.ok) {
        const body = await response.text();
        throw new Error(`getUpdates ${response.status}: ${body}`);
      }

      const data = (await response.json()) as {
        ok?: boolean;
        result?: Array<TelegramUpdate & { update_id: number }>;
      };

      for (const update of data.result ?? []) {
        offset = update.update_id + 1;
        await router.handleUpdate(update);
      }
    }
  } finally {
    await app.close();
  }
}

void main();
