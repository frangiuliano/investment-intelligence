/**
 * One-shot local helper: run the full MVP pipeline and exit.
 * Usage: npx ts-node -r tsconfig-paths/register scripts/run-pipeline-once.ts
 */
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { PipelineService } from '../src/pipeline/pipeline.service';

async function main() {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  try {
    const pipeline = app.get(PipelineService);
    const result = await pipeline.run();
    // eslint-disable-next-line no-console
    console.log(JSON.stringify(result));
  } finally {
    await app.close();
  }
}

void main();
