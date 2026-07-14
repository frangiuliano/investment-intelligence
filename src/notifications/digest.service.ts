import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ALERTABLE_MATERIALITY_VALUES } from '../analysis/gemini.constants';
import { NewsAnalysis } from '../analysis/entities/news-analysis.entity';
import {
  AppLocale,
  DEFAULT_DIGEST_LOOKBACK_HOURS,
} from '../config/env.validation';
import { RelevanceService } from '../relevance/relevance.service';
import { DigestItem } from './entities/digest-item.entity';
import { DigestRun } from './entities/digest-run.entity';
import {
  DigestItemInput,
  formatTelegramDigest,
  resolveTelegramTitle,
} from './telegram-message';
import { TelegramApiError, TelegramClient } from './telegram.client';
import { TELEGRAM_CHANNEL } from './telegram.constants';

export type DigestRunResult = {
  candidates: number;
  sent: number;
  skipped: boolean;
  errors: number;
};

@Injectable()
export class DigestService {
  private readonly logger = new Logger(DigestService.name);
  private running = false;

  constructor(
    private readonly configService: ConfigService,
    private readonly telegramClient: TelegramClient,
    private readonly relevanceService: RelevanceService,
    @InjectRepository(NewsAnalysis)
    private readonly newsAnalyses: Repository<NewsAnalysis>,
    @InjectRepository(DigestRun)
    private readonly digestRuns: Repository<DigestRun>,
    @InjectRepository(DigestItem)
    private readonly digestItems: Repository<DigestItem>,
  ) {}

  async sendDigest(): Promise<DigestRunResult> {
    if (this.running) {
      this.logger.warn(
        'Digest run already in progress; skipping overlapping run',
      );
      return { candidates: 0, sent: 0, skipped: true, errors: 0 };
    }

    this.running = true;
    try {
      const lookbackHours = this.resolveLookbackHours();
      const periodEnd = new Date();
      const periodStart = new Date(
        periodEnd.getTime() - lookbackHours * 60 * 60 * 1000,
      );

      const analyses = await this.findDigestCandidates(periodStart);
      const universe = await this.relevanceService.resolveWatchlistTickers();
      const items = analyses
        .map((analysis) => this.toDigestItem(analysis, universe))
        .filter(
          (item): item is DigestItemInput & { articleId: string } =>
            item !== null,
        );

      if (items.length === 0) {
        this.logger.log(
          `Digest skipped: no pending material medium+ items in last ${lookbackHours}h`,
        );
        return {
          candidates: analyses.length,
          sent: 0,
          skipped: true,
          errors: 0,
        };
      }

      const locale = this.configService.getOrThrow<AppLocale>('locale');
      const { message, includedCount } = formatTelegramDigest(
        {
          lookbackHours,
          items: items.map((item) => ({
            title: item.title,
            summary: item.summary,
            sentiment: item.sentiment,
            materiality: item.materiality,
            tickers: item.tickers,
            url: item.url,
            eventType: item.eventType,
          })),
        },
        locale,
      );
      const includedArticleIds = items
        .slice(0, includedCount)
        .map((item) => item.articleId);

      try {
        await this.telegramClient.sendMessage(message);
      } catch (error) {
        this.logger.error(`Failed to send digest: ${errorMessage(error)}`);
        return {
          candidates: items.length,
          sent: 0,
          skipped: false,
          errors: 1,
        };
      }

      try {
        await this.persistDigestRun({
          lookbackHours,
          periodStart,
          periodEnd,
          articleIds: includedArticleIds,
        });
      } catch (error) {
        this.logger.error(
          `Digest Telegram sent but persist failed: ${errorMessage(error)}`,
        );
        return {
          candidates: items.length,
          sent: 1,
          skipped: false,
          errors: 1,
        };
      }

      this.logger.log(
        `Digest sent: included=${includedArticleIds.length} candidates=${items.length} lookbackHours=${lookbackHours}`,
      );
      return {
        candidates: items.length,
        sent: 1,
        skipped: false,
        errors: 0,
      };
    } finally {
      this.running = false;
    }
  }

  /**
   * Material medium/high in the lookback window, not yet digested, and without
   * a real (non-suppressed) push alert — digest is the low-urgency channel.
   */
  private async findDigestCandidates(
    periodStart: Date,
  ): Promise<NewsAnalysis[]> {
    return this.newsAnalyses
      .createQueryBuilder('analysis')
      .innerJoinAndSelect('analysis.article', 'article')
      .leftJoin(
        DigestItem,
        'digest_item',
        'digest_item.article_id = analysis.article_id',
      )
      .leftJoin(
        'article.notifications',
        'push',
        `push.channel = :channel AND (push.payload->>'suppressed') IS DISTINCT FROM 'true'`,
        { channel: TELEGRAM_CHANNEL },
      )
      .where('analysis.analyzed_at >= :periodStart', { periodStart })
      .andWhere('analysis.materiality IN (:...materialities)', {
        materialities: [...ALERTABLE_MATERIALITY_VALUES],
      })
      .andWhere('digest_item.id IS NULL')
      .andWhere('push.id IS NULL')
      .orderBy('analysis.analyzedAt', 'ASC')
      .getMany();
  }

  private toDigestItem(
    analysis: NewsAnalysis,
    universe: string[],
  ): (DigestItemInput & { articleId: string }) | null {
    const article = analysis.article;
    if (!article) {
      return null;
    }

    const tickers = normalizeTickers(analysis.tickers ?? []);
    if (tickers.length === 0) {
      return null;
    }

    if (universe.length > 0) {
      const matched = tickers.filter((ticker) => universe.includes(ticker));
      if (matched.length === 0) {
        return null;
      }
    }

    return {
      articleId: analysis.articleId,
      title: resolveTelegramTitle(analysis.headline, article.title),
      summary: analysis.summary,
      sentiment: analysis.sentiment,
      materiality: analysis.materiality,
      tickers,
      url: article.url,
      eventType: analysis.eventType,
    };
  }

  private async persistDigestRun(input: {
    lookbackHours: number;
    periodStart: Date;
    periodEnd: Date;
    articleIds: string[];
  }): Promise<void> {
    await this.digestRuns.manager.transaction(async (manager) => {
      const run = await manager.save(
        DigestRun,
        manager.create(DigestRun, {
          channel: TELEGRAM_CHANNEL,
          itemCount: input.articleIds.length,
          lookbackHours: input.lookbackHours,
          periodStart: input.periodStart,
          periodEnd: input.periodEnd,
        }),
      );

      await manager.save(
        DigestItem,
        input.articleIds.map((articleId) =>
          manager.create(DigestItem, {
            digestRunId: run.id,
            articleId,
          }),
        ),
      );
    });
  }

  private resolveLookbackHours(): number {
    const configured = this.configService.get<number>('digest.lookbackHours');
    if (
      typeof configured === 'number' &&
      Number.isFinite(configured) &&
      configured > 0
    ) {
      return configured;
    }
    return DEFAULT_DIGEST_LOOKBACK_HOURS;
  }
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

function errorMessage(error: unknown): string {
  if (error instanceof TelegramApiError) {
    return error.message;
  }
  return error instanceof Error ? error.message : String(error);
}
