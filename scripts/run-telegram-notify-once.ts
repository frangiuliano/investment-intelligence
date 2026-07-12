/**
 * One-shot local helper: notify relevant unnotified articles and exit.
 * Usage: npm run telegram:notify-once
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
    const result = await notifications.notifyRelevant();
    // eslint-disable-next-line no-console
    console.log(JSON.stringify(result));
  } finally {
    await app.close();
  }
}

void main();
