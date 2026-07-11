import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SchedulerRegistry } from '@nestjs/schedule';
import { CronJob } from 'cron';
import { NewsCollectorService } from './news-collector.service';

const NEWS_COLLECTION_JOB = 'news-collection';

@Injectable()
export class NewsCollectorScheduler implements OnModuleInit {
  private readonly logger = new Logger(NewsCollectorScheduler.name);

  constructor(
    private readonly newsCollectorService: NewsCollectorService,
    private readonly configService: ConfigService,
    private readonly schedulerRegistry: SchedulerRegistry,
  ) {}

  onModuleInit(): void {
    const cronSchedule = this.configService.getOrThrow<string>(
      'collection.cronSchedule',
    );

    const job = CronJob.from({
      cronTime: cronSchedule,
      onTick: () => {
        void this.newsCollectorService.collect();
      },
    });

    this.schedulerRegistry.addCronJob(NEWS_COLLECTION_JOB, job);
    job.start();
    this.logger.log(
      `Registered news collection cron "${NEWS_COLLECTION_JOB}" with schedule: ${cronSchedule}`,
    );
  }
}
