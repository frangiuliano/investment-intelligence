import { HypothesisBias } from '../hypotheses/entities/hypothesis.entity';
import { HypothesisReviewOutcome } from './entities/hypothesis-review.entity';
import {
  MATERIAL_RETURN_PCT,
  classifyHypothesisReview,
  findCloseOnOrBefore,
  resolvePriceWindow,
} from './review-outcome';
import { OhlcvBar } from '../../market-data/market-data.types';

function bar(day: string, close: number): OhlcvBar {
  return { time: day, open: close, high: close, low: close, close, volume: 1 };
}

describe('review-outcome', () => {
  const bars: OhlcvBar[] = [
    bar('2026-01-02', 100),
    bar('2026-01-15', 102),
    bar('2026-02-01', 110),
    bar('2026-03-01', 95),
    bar('2026-04-01', 120),
  ];

  it('finds the last close on or before a day', () => {
    expect(findCloseOnOrBefore(bars, '2026-01-20')?.close).toBe(102);
  });

  it('resolves a price window return', () => {
    const window = resolvePriceWindow(
      bars,
      new Date('2026-01-02T00:00:00.000Z'),
      new Date('2026-02-01T00:00:00.000Z'),
    );
    expect(window?.returnPct).toBeCloseTo(10, 5);
  });

  it('marks inconclusive when bars are missing', () => {
    const result = classifyHypothesisReview({
      bias: HypothesisBias.BULLISH,
      horizonDays: 30,
      createdAt: new Date('2026-01-02T00:00:00.000Z'),
      closedAt: null,
      evaluationEnd: new Date('2026-02-15T00:00:00.000Z'),
      bars: null,
      priceUnavailableReason: 'not_found',
    });

    expect(result.outcome).toBe(HypothesisReviewOutcome.INCONCLUSIVE);
    expect(result.priceReturnPct).toBeNull();
    expect(result.explanation).toContain('not_found');
    expect(result.explanation).toContain('not a backtest');
  });

  it('confirms a bullish thesis when price rises materially', () => {
    const result = classifyHypothesisReview({
      bias: HypothesisBias.BULLISH,
      horizonDays: 40,
      createdAt: new Date('2026-01-02T00:00:00.000Z'),
      closedAt: null,
      evaluationEnd: new Date('2026-02-05T00:00:00.000Z'),
      bars,
    });

    expect(result.outcome).toBe(HypothesisReviewOutcome.THESIS_CONFIRMED);
    expect(result.priceReturnPct).toBeGreaterThanOrEqual(MATERIAL_RETURN_PCT);
  });

  it('rejects a bullish thesis when price falls materially', () => {
    const result = classifyHypothesisReview({
      bias: HypothesisBias.BULLISH,
      horizonDays: 60,
      createdAt: new Date('2026-01-02T00:00:00.000Z'),
      closedAt: null,
      evaluationEnd: new Date('2026-03-05T00:00:00.000Z'),
      bars,
    });

    expect(result.outcome).toBe(HypothesisReviewOutcome.THESIS_REJECTED);
  });

  it('flags timing when alignment appears only after the horizon', () => {
    const result = classifyHypothesisReview({
      bias: HypothesisBias.BULLISH,
      horizonDays: 13,
      createdAt: new Date('2026-01-02T00:00:00.000Z'),
      closedAt: null,
      evaluationEnd: new Date('2026-04-05T00:00:00.000Z'),
      bars,
    });

    expect(result.outcome).toBe(HypothesisReviewOutcome.TIMING_ISSUE);
  });
});
