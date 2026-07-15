import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { MarketDataService } from '../src/market-data/market-data.service';

async function main() {
  const symbol = process.argv[2];
  if (!symbol) {
    console.error('Usage: npm run market-data:once -- TICKER');
    process.exitCode = 1;
    return;
  }

  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn'],
  });

  try {
    const marketData = app.get(MarketDataService);
    const series = await marketData.getSeries(symbol);
    console.log(
      JSON.stringify({
        symbol: series.symbol,
        timeframe: series.timeframe,
        source: series.source,
        asOf: series.asOf,
        bars: series.bars.length,
        firstBar: series.bars[0],
        lastBar: series.bars.at(-1),
      }),
    );
  } finally {
    await app.close();
  }
}

void main();
