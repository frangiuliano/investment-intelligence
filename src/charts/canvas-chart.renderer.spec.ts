import { MarketSeries } from '../market-data/market-data.types';
import { CanvasChartRenderer } from './canvas-chart.renderer';
import { buildTechnicalChartModel } from './chart-marks';

const PNG_MAGIC_BYTES = Buffer.from([0x89, 0x50, 0x4e, 0x47]);

function seriesFixture(barCount: number): MarketSeries {
  return {
    symbol: 'AAPL',
    timeframe: '1d',
    asOf: '2026-07-17T15:00:00.000Z',
    source: 'yahoo-finance-chart',
    bars: Array.from({ length: barCount }, (_, index) => {
      const close = 100 + Math.sin(index / 5) * 10;
      return {
        time: `2026-04-${String((index % 30) + 1).padStart(2, '0')}`,
        open: close - 1,
        high: close + 2,
        low: close - 2,
        close,
        volume: 1_000 + index,
      };
    }),
  };
}

describe('CanvasChartRenderer', () => {
  const renderer = new CanvasChartRenderer();

  it('renders a non-empty PNG from an OHLCV fixture', () => {
    const model = buildTechnicalChartModel(seriesFixture(90), {
      smaPeriods: [20],
      maxBars: 90,
    });

    const png = renderer.render(model);

    expect(png.length).toBeGreaterThan(PNG_MAGIC_BYTES.length);
    expect(png.subarray(0, 4)).toEqual(PNG_MAGIC_BYTES);
  });

  it('renders a single-bar series without SMA values', () => {
    const model = buildTechnicalChartModel(seriesFixture(1), {
      smaPeriods: [20],
      maxBars: 90,
    });

    const png = renderer.render(model);

    expect(png.subarray(0, 4)).toEqual(PNG_MAGIC_BYTES);
  });

  it('renders multiple SMA overlays', () => {
    const model = buildTechnicalChartModel(seriesFixture(120), {
      smaPeriods: [20, 50],
      maxBars: 90,
    });

    const png = renderer.render(model);

    expect(png.subarray(0, 4)).toEqual(PNG_MAGIC_BYTES);
  });
});
