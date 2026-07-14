/**
 * One-shot local helper: send Telegram digest for the lookback window and exit.
 * Usage: npm run telegram:digest-once
 */
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { DigestService } from '../src/notifications/digest.service';

async function main() {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  try {
    const digest = app.get(DigestService);
    const result = await digest.sendDigest();
    // eslint-disable-next-line no-console
    console.log(JSON.stringify(result));
  } finally {
    await app.close();
  }
}

void main();
