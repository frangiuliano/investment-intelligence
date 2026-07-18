import { MarketSeries, OhlcvBar } from '../market-data/market-data.types';

export type TechnicalChartConfig = {
  smaPeriods: number[];
  maxBars: number;
};

export type SmaOverlay = {
  period: number;
  /** One entry per visible bar; null while the window has fewer bars than the period. */
  values: (number | null)[];
};

export type ChartLevels = {
  windowHigh: number;
  windowLow: number;
  lastClose: number;
};

export type TechnicalChartModel = {
  symbol: string;
  timeframe: string;
  source: string;
  asOf: string;
  bars: OhlcvBar[];
  smaOverlays: SmaOverlay[];
  levels: ChartLevels;
  priceRange: { min: number; max: number };
};

/**
 * Pure, deterministic computation of everything the renderer paints.
 * Numbers come only from the MarketSeries bars — never invented.
 */
export function buildTechnicalChartModel(
  series: MarketSeries,
  config: TechnicalChartConfig,
): TechnicalChartModel {
  if (series.bars.length === 0) {
    throw new Error('Cannot build a technical chart from an empty series');
  }
  if (config.maxBars < 1) {
    throw new Error('maxBars must be at least 1');
  }

  const visibleBars = series.bars.slice(-config.maxBars);
  const hiddenCount = series.bars.length - visibleBars.length;

  const smaOverlays = config.smaPeriods.map((period) => ({
    period,
    values: computeSma(series.bars, period).slice(hiddenCount),
  }));

  const levels = computeLevels(visibleBars);
  const priceRange = computePriceRange(visibleBars, smaOverlays);

  return {
    symbol: series.symbol,
    timeframe: series.timeframe,
    source: series.source,
    asOf: series.asOf,
    bars: visibleBars,
    smaOverlays,
    levels,
    priceRange,
  };
}

/**
 * Simple moving average over closes for the full series, so bars near the
 * start of the visible window still get values when older bars exist.
 */
export function computeSma(
  bars: OhlcvBar[],
  period: number,
): (number | null)[] {
  if (period < 1) {
    throw new Error('SMA period must be at least 1');
  }

  const values: (number | null)[] = [];
  let windowSum = 0;

  for (let index = 0; index < bars.length; index += 1) {
    windowSum += bars[index].close;
    if (index >= period) {
      windowSum -= bars[index - period].close;
    }
    values.push(index >= period - 1 ? windowSum / period : null);
  }

  return values;
}

function computeLevels(bars: OhlcvBar[]): ChartLevels {
  let windowHigh = bars[0].high;
  let windowLow = bars[0].low;

  for (const bar of bars) {
    if (bar.high > windowHigh) {
      windowHigh = bar.high;
    }
    if (bar.low < windowLow) {
      windowLow = bar.low;
    }
  }

  return {
    windowHigh,
    windowLow,
    lastClose: bars[bars.length - 1].close,
  };
}

function computePriceRange(
  bars: OhlcvBar[],
  smaOverlays: SmaOverlay[],
): { min: number; max: number } {
  let min = bars[0].low;
  let max = bars[0].high;

  for (const bar of bars) {
    min = Math.min(min, bar.low);
    max = Math.max(max, bar.high);
  }

  for (const overlay of smaOverlays) {
    for (const value of overlay.values) {
      if (value !== null) {
        min = Math.min(min, value);
        max = Math.max(max, value);
      }
    }
  }

  const span = max - min;
  // Flat series still needs a visible band to scale into.
  const padding = span === 0 ? Math.max(Math.abs(max) * 0.05, 1) : span * 0.05;

  return { min: min - padding, max: max + padding };
}
