import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MarketDataUnavailableError } from '../../market-data/market-data.errors';
import { MarketDataService } from '../../market-data/market-data.service';
import { TelegramClient } from '../../notifications/telegram.client';
import {
  Hypothesis,
  HypothesisBias,
  HypothesisStatus,
} from '../hypotheses/entities/hypothesis.entity';
import { HypothesisReviewOutcome } from './entities/hypothesis-review.entity';
import { ReviewsService } from './reviews.service';

describe('ReviewsService', () => {
  function createService(overrides?: {
    hypotheses?: Hypothesis[];
    getSeries?: jest.Mock;
    sendMessage?: jest.Mock;
  }) {
    const hypotheses = overrides?.hypotheses ?? [];
    const savedReviews: unknown[] = [];
    const savedRuns: Array<{ id: string; reviewedCount: number }> = [];

    const hypothesesRepository = {
      createQueryBuilder: () => ({
        where: () => ({
          andWhere: () => ({
            orderBy: () => ({
              getMany: () => Promise.resolve(hypotheses),
            }),
          }),
        }),
      }),
    };

    const reviewsRepository = {
      create: (value: unknown) => value,
      save: jest.fn((value: Record<string, unknown>) => {
        const row = { id: `review-${savedReviews.length + 1}`, ...value };
        savedReviews.push(row);
        return Promise.resolve(row);
      }),
      findAndCount: jest.fn(() =>
        Promise.resolve([savedReviews, savedReviews.length]),
      ),
      findOne: jest.fn(({ where }: { where: { id: string } }) => {
        return Promise.resolve(
          savedReviews.find((row) => (row as { id: string }).id === where.id) ??
            null,
        );
      }),
    };

    const reviewRunsRepository = {
      create: (value: unknown) => value,
      save: jest.fn((value: Record<string, unknown>) => {
        if (value.id) {
          const existing = savedRuns.find((run) => run.id === value.id);
          if (existing) {
            Object.assign(existing, value);
            return Promise.resolve(existing);
          }
        }
        const row = {
          id: `run-${savedRuns.length + 1}`,
          reviewedCount: 0,
          ...value,
        };
        savedRuns.push(row);
        return Promise.resolve(row);
      }),
    };
    const getSeries =
      overrides?.getSeries ??
      jest.fn().mockResolvedValue({
        symbol: 'AAPL',
        timeframe: '1d',
        asOf: '2026-04-01T00:00:00.000Z',
        source: 'yahoo-finance-chart',
        bars: [
          {
            time: '2025-12-01',
            open: 100,
            high: 100,
            low: 100,
            close: 100,
            volume: 1,
          },
          {
            time: '2026-01-15',
            open: 120,
            high: 120,
            low: 120,
            close: 120,
            volume: 1,
          },
        ],
      });
    const sendMessage =
      overrides?.sendMessage ?? jest.fn().mockResolvedValue(undefined);

    const service = new ReviewsService(
      {
        getOrThrow: (key: string) => {
          if (key === 'locale') {
            return 'en';
          }
          throw new Error(key);
        },
      } as unknown as ConfigService,
      { getSeries } as unknown as MarketDataService,
      { sendMessage } as unknown as TelegramClient,
      hypothesesRepository as never,
      reviewsRepository as never,
      reviewRunsRepository as never,
    );

    return {
      service,
      getSeries,
      sendMessage,
      reviewsRepository,
      reviewRunsRepository,
      savedReviews,
    };
  }

  const dueHypothesis: Hypothesis = {
    id: 'hyp-1',
    symbol: 'AAPL',
    bias: HypothesisBias.BULLISH,
    thesis: 'Growth',
    invalidation: 'Miss',
    horizonDays: 60,
    status: HypothesisStatus.CLOSED,
    source: 'manual' as never,
    sourceRefId: null,
    closedAt: new Date('2026-01-20T00:00:00.000Z'),
    closeNote: null,
    createdAt: new Date('2025-12-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-20T00:00:00.000Z'),
  };

  it('reviews due hypotheses, persists outcomes, and notifies Telegram', async () => {
    const { service, sendMessage, savedReviews } = createService({
      hypotheses: [dueHypothesis],
    });

    const result = await service.runPeriodReview({
      periodStart: new Date('2026-01-01T00:00:00.000Z'),
      periodEnd: new Date('2026-01-31T23:59:59.999Z'),
    });

    expect(result.ok).toBe(true);
    expect(result.reviews).toHaveLength(1);
    expect(result.reviews[0].outcome).toBe(
      HypothesisReviewOutcome.THESIS_CONFIRMED,
    );
    expect(savedReviews).toHaveLength(1);
    expect(sendMessage).toHaveBeenCalledWith(
      expect.stringContaining('Hypothesis review'),
    );
    expect(sendMessage).toHaveBeenCalledWith(
      expect.stringContaining('not a scientific backtest'),
    );
  });

  it('declares missing market data without inventing returns', async () => {
    const { service } = createService({
      hypotheses: [dueHypothesis],
      getSeries: jest
        .fn()
        .mockRejectedValue(
          new MarketDataUnavailableError('AAPL', 'not_found', 'missing'),
        ),
    });

    const result = await service.runPeriodReview({
      periodStart: new Date('2026-01-01T00:00:00.000Z'),
      periodEnd: new Date('2026-01-31T23:59:59.999Z'),
      notify: false,
    });

    expect(result.ok).toBe(true);
    expect(result.reviews[0].outcome).toBe(
      HypothesisReviewOutcome.INCONCLUSIVE,
    );
    expect(result.reviews[0].priceReturnPct).toBeNull();
    expect(result.reviews[0].priceUnavailableReason).toBe('not_found');
  });

  it('skips open hypotheses whose horizon has not elapsed', async () => {
    const openFuture: Hypothesis = {
      ...dueHypothesis,
      id: 'hyp-2',
      status: HypothesisStatus.OPEN,
      closedAt: null,
      horizonDays: 365,
      createdAt: new Date('2026-01-10T00:00:00.000Z'),
    };
    const { service, sendMessage } = createService({
      hypotheses: [openFuture],
    });

    const result = await service.runPeriodReview({
      periodStart: new Date('2026-01-01T00:00:00.000Z'),
      periodEnd: new Date('2026-01-31T23:59:59.999Z'),
    });

    expect(result.ok).toBe(true);
    expect(result.reviews).toHaveLength(0);
    expect(sendMessage).toHaveBeenCalledWith(
      expect.stringContaining('No hypotheses are due'),
    );
  });

  it('lists reviews with pagination metadata', async () => {
    const { service, savedReviews } = createService();
    savedReviews.push({ id: 'review-1' });

    const page = await service.findAll({ page: 1, limit: 10 });
    expect(page.total).toBe(1);
    expect(page.page).toBe(1);
    expect(page.limit).toBe(10);
  });

  it('throws NotFoundException for missing review detail', async () => {
    const { service } = createService();
    await expect(service.findOne('missing')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('rejects invalid month for calendar period helper', () => {
    const { service } = createService();
    expect(() => service.resolveCalendarMonthPeriod('2026-13')).toThrow(
      BadRequestException,
    );
  });
});
