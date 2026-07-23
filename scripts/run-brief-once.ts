/**
 * One-shot local helper: generate an educational brief for a ticker and send it
 * to TELEGRAM_CHAT_ID (bypasses webhook inbound).
 * Usage: npm run brief:once -- AAPL
 */
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { BriefService } from '../src/brief/brief.service';

async function main() {
  const symbol = process.argv[2];
  if (!symbol) {
    // eslint-disable-next-line no-console
    console.error('Usage: npm run brief:once -- TICKER');
    process.exitCode = 1;
    return;
  }

  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  try {
    const briefs = app.get(BriefService);
    const brief = await briefs.requestBriefOrThrow(symbol);
    // eslint-disable-next-line no-console
    console.log(
      JSON.stringify({
        ok: true,
        id: brief.id,
        symbol: brief.symbol,
        locale: brief.locale,
        promptVersion: brief.promptVersion,
        knowledgeVersion: brief.knowledgeVersion,
      }),
    );
  } finally {
    await app.close();
  }
}

void main();
