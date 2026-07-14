import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SchedulerRegistry } from '@nestjs/schedule';
import { CronJob } from 'cron';
import { DigestService } from './digest.service';

const DIGEST_JOB = 'investment-digest';

@Injectable()
export class DigestScheduler implements OnModuleInit {
  private readonly logger = new Logger(DigestScheduler.name);

  constructor(
    private readonly digestService: DigestService,
    private readonly configService: ConfigService,
    private readonly schedulerRegistry: SchedulerRegistry,
  ) {}

  onModuleInit(): void {
    const cronSchedule = this.configService.getOrThrow<string>(
      'digest.cronSchedule',
    );

    const job = CronJob.from({
      cronTime: cronSchedule,
      onTick: () => {
        void this.digestService.sendDigest().catch((error: unknown) => {
          this.logger.error(
            `Digest cron tick failed: ${error instanceof Error ? error.message : String(error)}`,
          );
        });
      },
    });

    this.schedulerRegistry.addCronJob(DIGEST_JOB, job);
    job.start();
    this.logger.log(
      `Registered digest cron "${DIGEST_JOB}" with schedule: ${cronSchedule}`,
    );
  }
}
