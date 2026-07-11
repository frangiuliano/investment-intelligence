import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryFailedError, Repository } from 'typeorm';
import { NewsArticle } from '../news/entities/news-article.entity';
import { NewsAnalysis } from './entities/news-analysis.entity';
import {
  GEMINI_BACKOFF_BASE_MS,
  GEMINI_FLASH_MODEL,
  GEMINI_MAX_RETRIES,
} from './gemini.constants';
import { GeminiApiError, GeminiClient } from './gemini.client';

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
      const articles = await this.findUnanalyzedArticles();
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
        `Analysis finished: pending=${result.pending} analyzed=${result.analyzed} skipped=${result.skipped} errors=${result.errors}`,
      );
      return result;
    } finally {
      this.running = false;
    }
  }

  private async findUnanalyzedArticles(): Promise<NewsArticle[]> {
    return this.newsArticles
      .createQueryBuilder('article')
      .leftJoin('article.analysis', 'analysis')
      .where('analysis.id IS NULL')
      .orderBy('article.created_at', 'ASC')
      .getMany();
  }

  private async analyzeArticle(
    article: NewsArticle,
  ): Promise<'analyzed' | 'skipped' | 'errors'> {
    try {
      const analysis = await this.analyzeWithRetry(article);
      await this.newsAnalyses.save(
        this.newsAnalyses.create({
          articleId: article.id,
          summary: analysis.summary,
          sentiment: analysis.sentiment,
          tickers: analysis.tickers,
          model: GEMINI_FLASH_MODEL,
        }),
      );
      return 'analyzed';
    } catch (error) {
      if (isUniqueViolation(error)) {
        return 'skipped';
      }
      this.logger.error(
        `Failed to analyze article ${article.id}: ${errorMessage(error)}`,
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
          const backoffMs = GEMINI_BACKOFF_BASE_MS * 2 ** (attempt - 1);
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
