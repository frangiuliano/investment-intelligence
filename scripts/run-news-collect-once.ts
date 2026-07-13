/**
 * One-shot local helper: run one RSS collection and exit.
 * Usage: npm run news:collect-once
 */
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { NewsCollectorService } from '../src/news/news-collector.service';

async function main() {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  try {
    const collector = app.get(NewsCollectorService);
    const result = await collector.collect();
    // eslint-disable-next-line no-console
    console.log(JSON.stringify(result));
  } finally {
    await app.close();
  }
}

void main();
