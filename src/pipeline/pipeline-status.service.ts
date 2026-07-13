import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NewsAnalysis } from '../analysis/entities/news-analysis.entity';
import { NewsArticle } from '../news/entities/news-article.entity';
import { Notification } from '../notifications/entities/notification.entity';
import { PipelineService } from './pipeline.service';

export type PipelineStatus = {
  articles: number;
  analyzed: number;
  notified: number;
  lastPipelineRunAt: string | null;
};

@Injectable()
export class PipelineStatusService {
  constructor(
    private readonly pipelineService: PipelineService,
    @InjectRepository(NewsArticle)
    private readonly newsArticles: Repository<NewsArticle>,
    @InjectRepository(NewsAnalysis)
    private readonly newsAnalyses: Repository<NewsAnalysis>,
    @InjectRepository(Notification)
    private readonly notifications: Repository<Notification>,
  ) {}

  async getStatus(): Promise<PipelineStatus> {
    const [articles, analyzed, notified] = await Promise.all([
      this.newsArticles.count(),
      this.newsAnalyses.count(),
      this.notifications.count(),
    ]);

    const lastRunAt = this.pipelineService.getLastRunAt();

    return {
      articles,
      analyzed,
      notified,
      lastPipelineRunAt: lastRunAt?.toISOString() ?? null,
    };
  }
}
