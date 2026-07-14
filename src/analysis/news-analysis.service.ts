import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryFailedError, Repository } from 'typeorm';
import { NewsArticle } from '../news/entities/news-article.entity';
import { NewsAnalysis } from './entities/news-analysis.entity';
import {
  GEMINI_BACKOFF_BASE_MS,
  GEMINI_MAX_RETRIES,
  GEMINI_MAX_RETRY_AFTER_MS,
} from './gemini.constants';
import { resolveRetryDelayMs } from './gemini-retry';
import { GeminiApiError, GeminiClient } from './gemini.client';
import type { GeminiAnalysisResult } from './gemini-response';

export type AnalysisRunResult = {
  pending: number;
  analyzed: number;
  skipped: number;
  errors: number;
};

@Injectable()
export class NewsAnalysisService {
  private readonly logger = new Logger(NewsAnalysisService.name);
  private running = false;
  /** Process-local skip set so permanent/exhausted failures do not stall the batch head. */
  private readonly deferredArticleIds = new Set<string>();
  /** Successful Gemini results awaiting DB persist (avoids re-calling Gemini). */
  private readonly pendingPersist = new Map<string, GeminiAnalysisResult>();

  constructor(
    private readonly configService: ConfigService,
    private readonly geminiClient: GeminiClient,
    @InjectRepository(NewsArticle)
    private readonly newsArticles: Repository<NewsArticle>,
    @InjectRepository(NewsAnalysis)
    private readonly newsAnalyses: Repository<NewsAnalysis>,
  ) {}

  async analyzePending(): Promise<AnalysisRunResult> {
    if (this.running) {
      this.logger.warn(
        'Analysis already in progress; skipping overlapping run',
      );
      return { pending: 0, analyzed: 0, skipped: 0, errors: 0 };
    }

    this.running = true;
    const result: AnalysisRunResult = {
      pending: 0,
      analyzed: 0,
      skipped: 0,
      errors: 0,
    };

    try {
      const batchSize = this.configService.getOrThrow<number>(
        'gemini.analysisBatchSize',
      );
      const articles = await this.findUnanalyzedArticles(batchSize);
      result.pending = articles.length;

      const delayMs = this.configService.getOrThrow<number>(
        'gemini.requestDelayMs',
      );

      for (let index = 0; index < articles.length; index += 1) {
        const article = articles[index];
        const outcome = await this.analyzeArticle(article);
        result[outcome] += 1;

        if (index < articles.length - 1 && delayMs > 0) {
          await sleep(delayMs);
        }
      }

      this.logger.log(
        `Analysis finished: batch=${batchSize} pending=${result.pending} analyzed=${result.analyzed} skipped=${result.skipped} errors=${result.errors}`,
      );
      return result;
    } finally {
      this.running = false;
    }
  }

  private async findUnanalyzedArticles(
    batchSize: number,
  ): Promise<NewsArticle[]> {
    const fetchSize = batchSize + this.deferredArticleIds.size;
    const candidates = await this.newsArticles
      .createQueryBuilder('article')
      .leftJoin('article.analysis', 'analysis')
      .where('analysis.id IS NULL')
      .orderBy('article.createdAt', 'ASC')
      .take(Math.max(fetchSize, batchSize))
      .getMany();

    return candidates
      .filter((article) => !this.deferredArticleIds.has(article.id))
      .slice(0, batchSize);
  }

  private async analyzeArticle(
    article: NewsArticle,
  ): Promise<'analyzed' | 'skipped' | 'errors'> {
    let analysis = this.pendingPersist.get(article.id);
    if (!analysis) {
      try {
        analysis = await this.analyzeWithRetry(article);
        this.pendingPersist.set(article.id, analysis);
      } catch (error) {
        this.deferredArticleIds.add(article.id);
        this.logger.error(
          `Failed to analyze article ${article.id}: ${errorMessage(error)} (deferred for this process)`,
        );
        return 'errors';
      }
    }

    try {
      const model = this.configService.getOrThrow<string>('gemini.model');
      await this.newsAnalyses.save(
        this.newsAnalyses.create({
          articleId: article.id,
          headline: analysis.headline,
          summary: analysis.summary,
          sentiment: analysis.sentiment,
          tickers: analysis.tickers,
          materiality: analysis.materiality,
          eventType: analysis.eventType,
          model,
        }),
      );
      this.pendingPersist.delete(article.id);
      this.deferredArticleIds.delete(article.id);
      return 'analyzed';
    } catch (error) {
      if (isUniqueViolation(error)) {
        this.pendingPersist.delete(article.id);
        this.deferredArticleIds.delete(article.id);
        return 'skipped';
      }
      this.logger.error(
        `Failed to persist analysis for article ${article.id}: ${errorMessage(error)}`,
      );
      return 'errors';
    }
  }

  private async analyzeWithRetry(article: NewsArticle) {
    let attempt = 0;
    while (true) {
      try {
        return await this.geminiClient.analyzeArticle({
          title: article.title,
          source: article.source,
          url: article.url,
          content: article.content,
        });
      } catch (error) {
        attempt += 1;
        if (
          error instanceof GeminiApiError &&
          error.retryable &&
          attempt <= GEMINI_MAX_RETRIES
        ) {
          const backoffMs = resolveRetryDelayMs({
            attempt,
            baseMs: GEMINI_BACKOFF_BASE_MS,
            retryAfterMs: error.retryAfterMs,
            maxMs: GEMINI_MAX_RETRY_AFTER_MS,
          });
          this.logger.warn(
            `Retryable Gemini error for article ${article.id} (attempt ${attempt}/${GEMINI_MAX_RETRIES}, status=${error.statusCode ?? 'n/a'}): waiting ${backoffMs}ms`,
          );
          await sleep(backoffMs);
          continue;
        }
        throw error;
      }
    }
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function isUniqueViolation(error: unknown): boolean {
  return (
    error instanceof QueryFailedError &&
    typeof error.driverError === 'object' &&
    error.driverError !== null &&
    'code' in error.driverError &&
    (error.driverError as { code?: string }).code === '23505'
  );
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
