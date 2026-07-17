import { ConfigService } from '@nestjs/config';
import { SchedulerRegistry } from '@nestjs/schedule';
import { ReviewScheduler } from './reviews.scheduler';
import { ReviewsService } from './reviews.service';

describe('ReviewScheduler', () => {
  it('runs the previous UTC month on the scheduled tick path', async () => {
    const runPeriodReview = jest.fn().mockResolvedValue({ ok: true });
    const resolvePreviousUtcMonthPeriod = jest.fn().mockReturnValue({
      periodStart: new Date('2026-02-01T00:00:00.000Z'),
      periodEnd: new Date('2026-02-28T23:59:59.999Z'),
    });

    const scheduler = new ReviewScheduler(
      {
        runPeriodReview,
        resolvePreviousUtcMonthPeriod,
      } as unknown as ReviewsService,
      {
        getOrThrow: (key: string) => {
          if (key === 'review.cronSchedule') {
            return '0 12 1 * *';
          }
          throw new Error(key);
        },
      } as unknown as ConfigService,
      {
        addCronJob: jest.fn(),
      } as unknown as SchedulerRegistry,
    );

    await scheduler.runScheduledReview();

    expect(resolvePreviousUtcMonthPeriod).toHaveBeenCalled();
    expect(runPeriodReview).toHaveBeenCalledWith({
      periodStart: new Date('2026-02-01T00:00:00.000Z'),
      periodEnd: new Date('2026-02-28T23:59:59.999Z'),
    });
  });
});
