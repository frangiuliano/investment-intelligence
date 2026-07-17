import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SchedulerRegistry } from '@nestjs/schedule';
import { CronJob } from 'cron';
import { ReviewsService } from './reviews.service';

const REVIEW_JOB = 'hypothesis-review';

@Injectable()
export class ReviewScheduler implements OnModuleInit {
  private readonly logger = new Logger(ReviewScheduler.name);

  constructor(
    private readonly reviewsService: ReviewsService,
    private readonly configService: ConfigService,
    private readonly schedulerRegistry: SchedulerRegistry,
  ) {}

  onModuleInit(): void {
    const cronSchedule = this.configService.getOrThrow<string>(
      'review.cronSchedule',
    );

    const job = CronJob.from({
      cronTime: cronSchedule,
      onTick: () => {
        void this.runScheduledReview().catch((error: unknown) => {
          this.logger.error(
            `Hypothesis review cron tick failed: ${
              error instanceof Error ? error.message : String(error)
            }`,
          );
        });
      },
    });

    this.schedulerRegistry.addCronJob(REVIEW_JOB, job);
    job.start();
    this.logger.log(
      `Registered hypothesis review cron "${REVIEW_JOB}" with schedule: ${cronSchedule}`,
    );
  }

  /** Exposed for tests: monthly cron reviews the previous UTC calendar month. */
  async runScheduledReview(): Promise<void> {
    const period = this.reviewsService.resolvePreviousUtcMonthPeriod();
    await this.reviewsService.runPeriodReview({
      periodStart: period.periodStart,
      periodEnd: period.periodEnd,
    });
  }
}
