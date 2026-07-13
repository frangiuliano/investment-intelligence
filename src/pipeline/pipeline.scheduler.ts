import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SchedulerRegistry } from '@nestjs/schedule';
import { CronJob } from 'cron';
import { PipelineService } from './pipeline.service';

const PIPELINE_JOB = 'investment-pipeline';

@Injectable()
export class PipelineScheduler implements OnModuleInit {
  private readonly logger = new Logger(PipelineScheduler.name);

  constructor(
    private readonly pipelineService: PipelineService,
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
        void this.pipelineService.run().catch((error: unknown) => {
          this.logger.error(
            `Pipeline cron tick failed: ${error instanceof Error ? error.message : String(error)}`,
          );
        });
      },
    });

    this.schedulerRegistry.addCronJob(PIPELINE_JOB, job);
    job.start();
    this.logger.log(
      `Registered pipeline cron "${PIPELINE_JOB}" with schedule: ${cronSchedule}`,
    );
  }
}
