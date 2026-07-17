import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import {
  Between,
  FindOptionsWhere,
  LessThanOrEqual,
  MoreThanOrEqual,
  Repository,
} from 'typeorm';
import { AppLocale } from '../../config/env.validation';
import { MarketDataUnavailableError } from '../../market-data/market-data.errors';
import { MarketDataService } from '../../market-data/market-data.service';
import { OhlcvBar } from '../../market-data/market-data.types';
import { TelegramClient } from '../../notifications/telegram.client';
import {
  Hypothesis,
  HypothesisStatus,
} from '../hypotheses/entities/hypothesis.entity';
import { HypothesisReviewRun } from './entities/hypothesis-review-run.entity';
import {
  HypothesisReview,
  HypothesisReviewOutcome,
} from './entities/hypothesis-review.entity';
import { classifyHypothesisReview } from './review-outcome';
import {
  formatReviewBusyMessage,
  formatReviewEmptyMessage,
  formatReviewErrorMessage,
  formatReviewSummaryMessage,
  ReviewSummaryCounts,
  ReviewSummaryItem,
} from './review-message';

export type RunPeriodReviewInput = {
  periodStart?: string | Date;
  periodEnd?: string | Date;
  /** When false, persist + return without Telegram. Default true. */
  notify?: boolean;
};

export type PeriodReviewResult = {
  run: HypothesisReviewRun | null;
  reviews: HypothesisReview[];
  message: string;
  ok: boolean;
  skipped: boolean;
};

export type ListReviewsQuery = {
  page?: number;
  limit?: number;
  hypothesisId?: string;
  from?: string;
  to?: string;
};

export type PaginatedReviews = {
  items: HypothesisReview[];
  page: number;
  limit: number;
  total: number;
};

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

@Injectable()
export class ReviewsService {
  private readonly logger = new Logger(ReviewsService.name);
  private running = false;

  constructor(
    private readonly configService: ConfigService,
    private readonly marketDataService: MarketDataService,
    private readonly telegramClient: TelegramClient,
    @InjectRepository(Hypothesis)
    private readonly hypothesesRepository: Repository<Hypothesis>,
    @InjectRepository(HypothesisReview)
    private readonly reviewsRepository: Repository<HypothesisReview>,
    @InjectRepository(HypothesisReviewRun)
    private readonly reviewRunsRepository: Repository<HypothesisReviewRun>,
  ) {}

  async runPeriodReview(
    input: RunPeriodReviewInput = {},
  ): Promise<PeriodReviewResult> {
    const locale = this.configService.getOrThrow<AppLocale>('locale');
    const notify = input.notify !== false;
    const { periodStart, periodEnd } = this.resolvePeriod(
      input.periodStart,
      input.periodEnd,
    );

    if (this.running) {
      const message = formatReviewBusyMessage(locale);
      if (notify) {
        await this.safeSend(message);
      }
      return {
        run: null,
        reviews: [],
        message,
        ok: false,
        skipped: true,
      };
    }

    this.running = true;
    try {
      const candidates = await this.findCandidateHypotheses(
        periodStart,
        periodEnd,
      );
      const due: Hypothesis[] = [];
      let skippedCount = 0;

      for (const hypothesis of candidates) {
        if (this.isDueForReview(hypothesis, periodEnd)) {
          due.push(hypothesis);
        } else {
          skippedCount += 1;
        }
      }

      if (due.length === 0) {
        const message = formatReviewEmptyMessage(
          periodStart,
          periodEnd,
          locale,
        );
        if (notify) {
          await this.safeSend(message);
        }
        const emptyRun = await this.reviewRunsRepository.save(
          this.reviewRunsRepository.create({
            periodStart,
            periodEnd,
            reviewedCount: 0,
            skippedCount,
            locale,
            summaryMessage: message,
          }),
        );
        return {
          run: emptyRun,
          reviews: [],
          message,
          ok: true,
          skipped: false,
        };
      }

      const reviews: HypothesisReview[] = [];
      const summaryItems: ReviewSummaryItem[] = [];
      const counts: ReviewSummaryCounts = {
        reviewed: 0,
        thesisConfirmed: 0,
        thesisRejected: 0,
        timingIssue: 0,
        inconclusive: 0,
        skipped: skippedCount,
      };

      const run = await this.reviewRunsRepository.save(
        this.reviewRunsRepository.create({
          periodStart,
          periodEnd,
          reviewedCount: 0,
          skippedCount,
          locale,
          summaryMessage: null,
        }),
      );

      for (const hypothesis of due) {
        const review = await this.reviewOneHypothesis({
          hypothesis,
          runId: run.id,
          periodEnd,
          locale,
        });
        reviews.push(review);
        summaryItems.push({
          symbol: hypothesis.symbol,
          outcome: review.outcome,
          priceReturnPct: review.priceReturnPct,
        });
        counts.reviewed += 1;
        this.bumpOutcomeCount(counts, review.outcome);
      }

      const message = formatReviewSummaryMessage(
        {
          periodStart,
          periodEnd,
          counts,
          items: summaryItems,
        },
        locale,
      );

      run.reviewedCount = reviews.length;
      run.summaryMessage = message;
      await this.reviewRunsRepository.save(run);

      if (notify) {
        try {
          await this.telegramClient.sendMessage(message);
        } catch (error) {
          const detail = error instanceof Error ? error.message : String(error);
          this.logger.error(
            `Review run ${run.id} persisted but Telegram delivery failed: ${detail}`,
          );
          return {
            run,
            reviews,
            message: formatReviewErrorMessage(locale),
            ok: false,
            skipped: false,
          };
        }
      }

      return { run, reviews, message, ok: true, skipped: false };
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      this.logger.error(`Hypothesis review run failed: ${detail}`);
      const message = formatReviewErrorMessage(locale);
      if (notify) {
        await this.safeSend(message);
      }
      return {
        run: null,
        reviews: [],
        message,
        ok: false,
        skipped: false,
      };
    } finally {
      this.running = false;
    }
  }

  async runPeriodReviewOrThrow(
    input: RunPeriodReviewInput = {},
  ): Promise<{ run: HypothesisReviewRun; reviews: HypothesisReview[] }> {
    const result = await this.runPeriodReview(input);
    if (!result.ok || !result.run) {
      throw new ConflictException(result.message);
    }
    return { run: result.run, reviews: result.reviews };
  }

  async findAll(query: ListReviewsQuery = {}): Promise<PaginatedReviews> {
    const page = this.parsePage(query.page);
    const limit = this.parseLimit(query.limit);
    const where: FindOptionsWhere<HypothesisReview> = {};

    if (query.hypothesisId !== undefined) {
      if (!UUID_PATTERN.test(query.hypothesisId)) {
        throw new BadRequestException('hypothesisId must be a valid UUID');
      }
      where.hypothesisId = query.hypothesisId;
    }

    const from = query.from ? this.parseDate(query.from, 'from') : undefined;
    const to = query.to ? this.parseDate(query.to, 'to') : undefined;
    if (from && to) {
      if (to < from) {
        throw new BadRequestException('to must be >= from');
      }
      where.createdAt = Between(from, to);
    } else if (from) {
      where.createdAt = MoreThanOrEqual(from);
    } else if (to) {
      where.createdAt = LessThanOrEqual(to);
    }

    const [items, total] = await this.reviewsRepository.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { items, page, limit, total };
  }

  async findOne(id: string): Promise<HypothesisReview> {
    const review = await this.reviewsRepository.findOne({ where: { id } });
    if (!review) {
      throw new NotFoundException(`Review ${id} not found`);
    }
    return review;
  }

  resolveCalendarMonthPeriod(yearMonth?: string): {
    periodStart: Date;
    periodEnd: Date;
  } {
    if (!yearMonth || yearMonth.trim() === '') {
      return this.currentUtcMonthPeriod();
    }

    const match = yearMonth.trim().match(/^(\d{4})-(\d{2})$/);
    if (!match) {
      throw new BadRequestException('month must use YYYY-MM');
    }
    const year = Number(match[1]);
    const month = Number(match[2]);
    if (month < 1 || month > 12) {
      throw new BadRequestException('month must use YYYY-MM');
    }

    const periodStart = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
    const periodEnd = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));
    return { periodStart, periodEnd };
  }

  private async reviewOneHypothesis(input: {
    hypothesis: Hypothesis;
    runId: string;
    periodEnd: Date;
    locale: AppLocale;
  }): Promise<HypothesisReview> {
    let bars: OhlcvBar[] | null = null;
    let priceUnavailableReason: string | null = null;
    let marketSource: string | null = null;
    let priceAsOf: Date | null = null;

    try {
      const series = await this.marketDataService.getSeries(
        input.hypothesis.symbol,
      );
      bars = series.bars;
      marketSource = series.source;
      priceAsOf = new Date(series.asOf);
    } catch (error) {
      if (error instanceof MarketDataUnavailableError) {
        priceUnavailableReason = error.reason;
      } else {
        priceUnavailableReason = 'provider_error';
      }
      this.logger.warn(
        `Market data unavailable for ${input.hypothesis.symbol}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }

    const classification = classifyHypothesisReview({
      bias: input.hypothesis.bias,
      horizonDays: input.hypothesis.horizonDays,
      createdAt: input.hypothesis.createdAt,
      closedAt: input.hypothesis.closedAt,
      evaluationEnd: input.periodEnd,
      bars,
      priceUnavailableReason,
    });

    return this.reviewsRepository.save(
      this.reviewsRepository.create({
        reviewRunId: input.runId,
        hypothesisId: input.hypothesis.id,
        outcome: classification.outcome,
        thesisQualityNote: classification.thesisQualityNote,
        timingNote: classification.timingNote,
        learningNote: classification.learningNote,
        explanation: classification.explanation,
        priceReturnPct: classification.priceReturnPct,
        priceStart: classification.priceStart,
        priceEnd: classification.priceEnd,
        priceAsOf,
        marketSource,
        priceUnavailableReason,
        locale: input.locale,
      }),
    );
  }

  private async findCandidateHypotheses(
    periodStart: Date,
    periodEnd: Date,
  ): Promise<Hypothesis[]> {
    return this.hypothesesRepository
      .createQueryBuilder('h')
      .where('h.created_at <= :periodEnd', { periodEnd })
      .andWhere(
        '(h.status = :closed AND h.closed_at >= :periodStart AND h.closed_at <= :periodEnd) OR (h.status = :open AND h.created_at <= :periodEnd)',
        {
          closed: HypothesisStatus.CLOSED,
          open: HypothesisStatus.OPEN,
          periodStart,
          periodEnd,
        },
      )
      .orderBy('h.created_at', 'ASC')
      .getMany();
  }

  private isDueForReview(hypothesis: Hypothesis, periodEnd: Date): boolean {
    if (hypothesis.status === HypothesisStatus.CLOSED) {
      return hypothesis.closedAt !== null;
    }

    const horizonEnd = new Date(hypothesis.createdAt.getTime());
    horizonEnd.setUTCDate(horizonEnd.getUTCDate() + hypothesis.horizonDays);
    return horizonEnd.getTime() <= periodEnd.getTime();
  }

  private resolvePeriod(
    rawStart?: string | Date,
    rawEnd?: string | Date,
  ): { periodStart: Date; periodEnd: Date } {
    if (!rawStart && !rawEnd) {
      return this.currentUtcMonthPeriod();
    }

    if (!rawStart || !rawEnd) {
      throw new BadRequestException(
        'periodStart and periodEnd must be provided together',
      );
    }

    const periodStart = this.parseDate(rawStart, 'periodStart');
    const periodEnd = this.parseDate(rawEnd, 'periodEnd');
    if (periodEnd < periodStart) {
      throw new BadRequestException('periodEnd must be >= periodStart');
    }
    return { periodStart, periodEnd };
  }

  private currentUtcMonthPeriod(): {
    periodStart: Date;
    periodEnd: Date;
  } {
    const now = new Date();
    const periodStart = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0),
    );
    const periodEnd = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0, 23, 59, 59, 999),
    );
    return { periodStart, periodEnd };
  }

  private parseDate(value: string | Date, field: string): Date {
    if (value instanceof Date) {
      if (Number.isNaN(value.getTime())) {
        throw new BadRequestException(`${field} must be a valid ISO date`);
      }
      return value;
    }
    if (typeof value !== 'string' || value.trim() === '') {
      throw new BadRequestException(`${field} must be a valid ISO date`);
    }
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      throw new BadRequestException(`${field} must be a valid ISO date`);
    }
    return parsed;
  }

  private parsePage(page?: number): number {
    if (page === undefined) {
      return 1;
    }
    if (!Number.isInteger(page) || page < 1) {
      throw new BadRequestException('page must be a positive integer');
    }
    return page;
  }

  private parseLimit(limit?: number): number {
    if (limit === undefined) {
      return DEFAULT_PAGE_SIZE;
    }
    if (!Number.isInteger(limit) || limit < 1 || limit > MAX_PAGE_SIZE) {
      throw new BadRequestException(
        `limit must be an integer between 1 and ${MAX_PAGE_SIZE}`,
      );
    }
    return limit;
  }

  private bumpOutcomeCount(
    counts: ReviewSummaryCounts,
    outcome: HypothesisReviewOutcome,
  ): void {
    switch (outcome) {
      case HypothesisReviewOutcome.THESIS_CONFIRMED:
        counts.thesisConfirmed += 1;
        break;
      case HypothesisReviewOutcome.THESIS_REJECTED:
        counts.thesisRejected += 1;
        break;
      case HypothesisReviewOutcome.TIMING_ISSUE:
        counts.timingIssue += 1;
        break;
      default:
        counts.inconclusive += 1;
    }
  }

  private async safeSend(message: string): Promise<void> {
    try {
      await this.telegramClient.sendMessage(message);
    } catch (error) {
      this.logger.error(
        `Failed to send review Telegram message: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }
}
