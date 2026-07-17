/**
 * One-shot local helper: run a hypothesis review for a UTC calendar month
 * (default: current month) and send the Telegram summary.
 * Usage:
 *   npm run review:once
 *   npm run review:once -- 2026-01
 */
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { ReviewsService } from '../src/research/reviews/reviews.service';

async function main() {
  const monthArg = process.argv[2];

  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  try {
    const reviews = app.get(ReviewsService);
    const period = reviews.resolveCalendarMonthPeriod(monthArg);
    const { run, reviews: items } = await reviews.runPeriodReviewOrThrow({
      periodStart: period.periodStart,
      periodEnd: period.periodEnd,
    });
    // eslint-disable-next-line no-console
    console.log(
      JSON.stringify({
        ok: true,
        runId: run.id,
        reviewedCount: run.reviewedCount,
        skippedCount: run.skippedCount,
        reviewIds: items.map((item) => item.id),
        periodStart: period.periodStart.toISOString(),
        periodEnd: period.periodEnd.toISOString(),
      }),
    );
  } finally {
    await app.close();
  }
}

void main();
