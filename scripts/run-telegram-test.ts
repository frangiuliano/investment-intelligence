/**
 * One-shot local helper: send a Telegram test message and exit.
 * Usage: npm run telegram:test
 */
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { NotificationsService } from '../src/notifications/notifications.service';

async function main() {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  try {
    const notifications = app.get(NotificationsService);
    await notifications.sendTestMessage();
    // eslint-disable-next-line no-console
    console.log(JSON.stringify({ ok: true }));
  } finally {
    await app.close();
  }
}

void main();
