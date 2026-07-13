import { Injectable, Logger } from '@nestjs/common';
import { NewsAnalysisService } from '../analysis/news-analysis.service';
import {
  CollectionRunResult,
  NewsCollectorService,
} from '../news/news-collector.service';
import { NotificationsService } from '../notifications/notifications.service';
import {
  RelevanceRunResult,
  RelevanceService,
} from '../relevance/relevance.service';
import type { AnalysisRunResult } from '../analysis/news-analysis.service';
import type { NotifyRunResult } from '../notifications/notifications.service';

export type PipelineRunResult = {
  collection: CollectionRunResult;
  analysis: AnalysisRunResult;
  relevance: RelevanceRunResult;
  notifications: NotifyRunResult;
  finishedAt: Date;
};

type PipelineStage = 'collection' | 'analysis' | 'relevance' | 'notifications';

@Injectable()
export class PipelineService {
  private readonly logger = new Logger(PipelineService.name);
  private running = false;
  private lastRunAt: Date | null = null;
  private lastRunResult: PipelineRunResult | null = null;

  constructor(
    private readonly newsCollectorService: NewsCollectorService,
    private readonly newsAnalysisService: NewsAnalysisService,
    private readonly relevanceService: RelevanceService,
    private readonly notificationsService: NotificationsService,
  ) {}

  getLastRunAt(): Date | null {
    return this.lastRunAt;
  }

  getLastRunResult(): PipelineRunResult | null {
    return this.lastRunResult;
  }

  async run(): Promise<PipelineRunResult | null> {
    if (this.running) {
      this.logger.warn(
        'Pipeline already in progress; skipping overlapping run',
      );
      return null;
    }

    this.running = true;
    let stage: PipelineStage = 'collection';

    try {
      const collection = await this.newsCollectorService.collect();
      this.logger.log(
        `Pipeline stage collection: ${JSON.stringify({ stage: 'collection', ...collection })}`,
      );

      stage = 'analysis';
      const analysis = await this.newsAnalysisService.analyzePending();
      this.logger.log(
        `Pipeline stage analysis: ${JSON.stringify({ stage: 'analysis', ...analysis })}`,
      );

      stage = 'relevance';
      const relevance = await this.relevanceService.evaluatePending();
      this.logger.log(
        `Pipeline stage relevance: ${JSON.stringify({ stage: 'relevance', ...relevance })}`,
      );

      stage = 'notifications';
      const notifications = await this.notificationsService.notifyRelevant();
      this.logger.log(
        `Pipeline stage notifications: ${JSON.stringify({ stage: 'notifications', ...notifications })}`,
      );

      const finishedAt = new Date();
      const result: PipelineRunResult = {
        collection,
        analysis,
        relevance,
        notifications,
        finishedAt,
      };

      this.lastRunAt = finishedAt;
      this.lastRunResult = result;

      this.logger.log(
        `Pipeline finished at ${finishedAt.toISOString()}: inserted=${collection.inserted} analyzed=${analysis.analyzed} relevant=${relevance.relevant} sent=${notifications.sent}`,
      );

      return result;
    } catch (error) {
      this.logger.error(
        `Pipeline failed at stage=${stage}: ${errorMessage(error)}`,
      );
      return null;
    } finally {
      this.running = false;
    }
  }
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
