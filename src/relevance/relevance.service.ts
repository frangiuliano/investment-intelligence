import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SENTIMENT_VALUES } from '../analysis/gemini.constants';
import { NewsAnalysis } from '../analysis/entities/news-analysis.entity';
import { Notification } from '../notifications/entities/notification.entity';
import type { RelevanceInput, RelevanceResult } from './relevance.types';

export type RelevanceRunResult = {
  candidates: number;
  relevant: number;
  notRelevant: number;
};

@Injectable()
export class RelevanceService {
  private readonly logger = new Logger(RelevanceService.name);

  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(NewsAnalysis)
    private readonly newsAnalyses: Repository<NewsAnalysis>,
    @InjectRepository(Notification)
    private readonly notifications: Repository<Notification>,
  ) {}

  evaluate(input: RelevanceInput): RelevanceResult {
    const watchlist =
      this.configService.get<string[]>('watchlist.tickers') ?? [];

    if (input.alreadyNotified) {
      return { isRelevant: false, reason: 'already notified' };
    }

    const sentiment = normalizeSentiment(input.sentiment);
    if (sentiment === 'neutral') {
      return { isRelevant: false, reason: 'neutral sentiment' };
    }
    if (!(SENTIMENT_VALUES as readonly string[]).includes(sentiment)) {
      return { isRelevant: false, reason: 'invalid sentiment' };
    }

    const tickers = normalizeTickers(input.tickers);
    if (tickers.length === 0) {
      return { isRelevant: false, reason: 'no tickers' };
    }

    if (watchlist.length > 0) {
      const matched = tickers.filter((ticker) => watchlist.includes(ticker));
      if (matched.length === 0) {
        return { isRelevant: false, reason: 'no watchlist tickers' };
      }
    }

    return {
      isRelevant: true,
      reason: 'non-neutral sentiment with tickers',
    };
  }

  async evaluatePending(): Promise<RelevanceRunResult> {
    const analyses = await this.findUnnotifiedAnalyses();
    const result: RelevanceRunResult = {
      candidates: analyses.length,
      relevant: 0,
      notRelevant: 0,
    };

    for (const analysis of analyses) {
      const alreadyNotified = await this.notifications.exists({
        where: { articleId: analysis.articleId },
      });

      const evaluation = this.evaluate({
        sentiment: analysis.sentiment,
        tickers: analysis.tickers ?? [],
        alreadyNotified,
      });

      if (evaluation.isRelevant) {
        result.relevant += 1;
      } else {
        result.notRelevant += 1;
      }
    }

    this.logger.log(
      `Relevance finished: candidates=${result.candidates} relevant=${result.relevant} notRelevant=${result.notRelevant}`,
    );

    return result;
  }

  async evaluateArticle(articleId: string): Promise<RelevanceResult | null> {
    const analysis = await this.newsAnalyses.findOne({
      where: { articleId },
    });

    if (!analysis) {
      this.logger.debug(`No analysis found for article ${articleId}`);
      return null;
    }

    const alreadyNotified = await this.notifications.exists({
      where: { articleId },
    });

    return this.evaluate({
      sentiment: analysis.sentiment,
      tickers: analysis.tickers ?? [],
      alreadyNotified,
    });
  }

  private async findUnnotifiedAnalyses(): Promise<NewsAnalysis[]> {
    return this.newsAnalyses
      .createQueryBuilder('analysis')
      .innerJoin('analysis.article', 'article')
      .leftJoin('article.notifications', 'notification')
      .where('notification.id IS NULL')
      .orderBy('analysis.analyzedAt', 'ASC')
      .getMany();
  }
}

function normalizeSentiment(sentiment: string): string {
  return sentiment.trim().toLowerCase();
}

function normalizeTickers(tickers: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const raw of tickers) {
    const ticker = raw.trim().toUpperCase();
    if (!ticker || seen.has(ticker)) {
      continue;
    }
    seen.add(ticker);
    result.push(ticker);
  }

  return result;
}
