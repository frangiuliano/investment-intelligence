import { MarketSeries, OhlcvBar } from '../market-data/market-data.types';
import { buildTechnicalChartModel, computeSma } from './chart-marks';

function barsFixture(closes: number[]): OhlcvBar[] {
  return closes.map((close, index) => ({
    time: `2026-01-${String(index + 1).padStart(2, '0')}`,
    open: close - 1,
    high: close + 2,
    low: close - 2,
    close,
    volume: 1_000 + index,
  }));
}

function seriesFixture(closes: number[]): MarketSeries {
  return {
    symbol: 'AAPL',
    timeframe: '1d',
    asOf: '2026-07-17T15:00:00.000Z',
    source: 'yahoo-finance-chart',
    bars: barsFixture(closes),
  };
}

describe('computeSma', () => {
  it('returns null until the window is full, then rolling averages', () => {
    const values = computeSma(barsFixture([10, 20, 30, 40]), 3);

    expect(values).toEqual([null, null, 20, 30]);
  });

  it('handles period 1 as the close series itself', () => {
    const values = computeSma(barsFixture([10, 20]), 1);

    expect(values).toEqual([10, 20]);
  });

  it('rejects non-positive periods', () => {
    expect(() => computeSma(barsFixture([10]), 0)).toThrow(
      'SMA period must be at least 1',
    );
  });
});

describe('buildTechnicalChartModel', () => {
  const config = { smaPeriods: [3], maxBars: 90 };

  it('throws on an empty series', () => {
    expect(() => buildTechnicalChartModel(seriesFixture([]), config)).toThrow(
      'empty series',
    );
  });

  it('computes levels from the visible window only', () => {
    const model = buildTechnicalChartModel(
      seriesFixture([10, 20, 30, 40, 50]),
      { smaPeriods: [2], maxBars: 3 },
    );

    expect(model.bars).toHaveLength(3);
    expect(model.levels).toEqual({
      windowHigh: 52,
      windowLow: 28,
      lastClose: 50,
    });
  });

  it('keeps SMA values computed from bars older than the visible window', () => {
    const model = buildTechnicalChartModel(
      seriesFixture([10, 20, 30, 40, 50]),
      { smaPeriods: [3], maxBars: 2 },
    );

    // Visible bars are closes 40 and 50; SMA(3) uses hidden bars 20/30.
    expect(model.smaOverlays).toEqual([{ period: 3, values: [30, 40] }]);
  });

  it('pads the price range so bars never touch the plot edges', () => {
    const model = buildTechnicalChartModel(seriesFixture([100]), config);

    expect(model.priceRange.min).toBeLessThan(98);
    expect(model.priceRange.max).toBeGreaterThan(102);
  });

  it('produces a deterministic model for the same input', () => {
    const series = seriesFixture([10, 12, 11, 15, 14, 18]);

    const first = buildTechnicalChartModel(series, config);
    const second = buildTechnicalChartModel(series, config);

    expect(second).toEqual(first);
  });
});
