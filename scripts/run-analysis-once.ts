/**
 * One-shot local helper: analyze pending news articles and exit.
 * Usage: npx ts-node -r tsconfig-paths/register scripts/run-analysis-once.ts
 */
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { NewsAnalysisService } from '../src/analysis/news-analysis.service';

async function main() {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  try {
    const analysis = app.get(NewsAnalysisService);
    const result = await analysis.analyzePending();
    // eslint-disable-next-line no-console
    console.log(JSON.stringify(result));
  } finally {
    await app.close();
  }
}

void main();
