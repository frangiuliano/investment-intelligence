import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  ALERTABLE_MATERIALITY_VALUES,
  CATALYST_EVENT_TYPES,
  EVENT_TYPE_VALUES,
  MATERIALITY_VALUES,
  SENTIMENT_VALUES,
} from '../analysis/gemini.constants';
import { NewsAnalysis } from '../analysis/entities/news-analysis.entity';
import { Notification } from '../notifications/entities/notification.entity';
import { HoldingsService } from '../portfolio/holdings/holdings.service';
import { WatchlistService } from '../portfolio/watchlist/watchlist.service';
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
    private readonly watchlistService: WatchlistService,
    private readonly holdingsService: HoldingsService,
    @InjectRepository(NewsAnalysis)
    private readonly newsAnalyses: Repository<NewsAnalysis>,
    @InjectRepository(Notification)
    private readonly notifications: Repository<Notification>,
  ) {}

  /**
   * Operator universe: active watchlist ∪ holdings symbols.
   * When both are empty, falls back to `WATCHLIST_TICKERS` (env).
   */
  async resolveWatchlistTickers(): Promise<string[]> {
    const [watchlist, holdings] = await Promise.all([
      this.watchlistService.listActiveSymbols(),
      this.holdingsService.listActiveSymbols(),
    ]);
    const universe = mergeUniqueSymbols(watchlist, holdings);
    if (universe.length > 0) {
      return universe;
    }
    return this.configService.get<string[]>('watchlist.tickers') ?? [];
  }

  evaluate(input: RelevanceInput): RelevanceResult {
    const watchlist =
      input.watchlistTickers ??
      this.configService.get<string[]>('watchlist.tickers') ??
      [];

    if (input.alreadyNotified) {
      return { isRelevant: false, reason: 'already notified' };
    }

    const sentiment = normalizeSentiment(input.sentiment);
    if (!(SENTIMENT_VALUES as readonly string[]).includes(sentiment)) {
      return { isRelevant: false, reason: 'invalid sentiment' };
    }

    const tickers = normalizeTickers(input.tickers);
    if (tickers.length === 0) {
      return { isRelevant: false, reason: 'no tickers' };
    }

    const materiality = normalizeMateriality(input.materiality);
    if (!(MATERIALITY_VALUES as readonly string[]).includes(materiality)) {
      return { isRelevant: false, reason: 'invalid materiality' };
    }
    if (
      !(ALERTABLE_MATERIALITY_VALUES as readonly string[]).includes(materiality)
    ) {
      return { isRelevant: false, reason: 'low materiality' };
    }

    const eventType = normalizeEventType(input.eventType);
    const isCatalyst = (CATALYST_EVENT_TYPES as readonly string[]).includes(
      eventType,
    );

    if (sentiment === 'neutral' && !isCatalyst) {
      return { isRelevant: false, reason: 'neutral sentiment' };
    }

    if (watchlist.length > 0) {
      const matched = tickers.filter((ticker) => watchlist.includes(ticker));
      if (matched.length === 0) {
        return { isRelevant: false, reason: 'no watchlist tickers' };
      }
    }

    if (isCatalyst && sentiment === 'neutral') {
      return {
        isRelevant: true,
        reason: 'catalyst event with tickers and materiality',
      };
    }

    return {
      isRelevant: true,
      reason: 'non-neutral sentiment with tickers and materiality',
    };
  }

  async evaluatePending(): Promise<RelevanceRunResult> {
    const analyses = await this.findUnnotifiedAnalyses();
    const watchlistTickers = await this.resolveWatchlistTickers();
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
        materiality: analysis.materiality,
        eventType: analysis.eventType,
        alreadyNotified,
        watchlistTickers,
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
    const watchlistTickers = await this.resolveWatchlistTickers();

    return this.evaluate({
      sentiment: analysis.sentiment,
      tickers: analysis.tickers ?? [],
      materiality: analysis.materiality,
      eventType: analysis.eventType,
      alreadyNotified,
      watchlistTickers,
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

function normalizeMateriality(materiality: string): string {
  return materiality.trim().toLowerCase();
}

function normalizeEventType(eventType: string | undefined): string {
  if (eventType === undefined || eventType === null) {
    return 'none';
  }
  const normalized = eventType.trim().toLowerCase();
  if ((EVENT_TYPE_VALUES as readonly string[]).includes(normalized)) {
    return normalized;
  }
  return 'none';
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

function mergeUniqueSymbols(...lists: string[][]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const list of lists) {
    for (const raw of list) {
      const symbol = raw.trim().toUpperCase();
      if (!symbol || seen.has(symbol)) {
        continue;
      }
      seen.add(symbol);
      result.push(symbol);
    }
  }
  return result;
}
