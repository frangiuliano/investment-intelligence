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
        void this.reviewsService.runPeriodReview().catch((error: unknown) => {
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
}
