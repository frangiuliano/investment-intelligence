import { MarketSeries } from '../market-data/market-data.types';

const RECENT_CLOSE_COUNT = 5;

/**
 * Compact labeled facts for the Gemini prompt. Numbers come only from MarketSeries.
 */
export function buildMarketFactsBlock(series: MarketSeries): string {
  if (series.bars.length === 0) {
    throw new Error('Cannot build market facts from an empty series');
  }

  const first = series.bars[0];
  const last = series.bars[series.bars.length - 1];
  const windowChangePct =
    first.close === 0 ? null : ((last.close - first.close) / first.close) * 100;

  let windowHigh = series.bars[0].high;
  let windowLow = series.bars[0].low;
  for (const bar of series.bars) {
    if (bar.high > windowHigh) {
      windowHigh = bar.high;
    }
    if (bar.low < windowLow) {
      windowLow = bar.low;
    }
  }

  const recentCloses = series.bars
    .slice(-RECENT_CLOSE_COUNT)
    .map((bar) => `${bar.time}=${formatNumber(bar.close)}`)
    .join(', ');

  return [
    `Market facts (source=${series.source}, asOf=${series.asOf}, timeframe=${series.timeframe}):`,
    `barCount=${series.bars.length}`,
    `firstBar=${first.time} close=${formatNumber(first.close)}`,
    `lastBar=${last.time} close=${formatNumber(last.close)}`,
    `windowCloseChangePct=${
      windowChangePct === null ? 'n/a' : formatNumber(windowChangePct)
    }`,
    `windowHigh=${formatNumber(windowHigh)}`,
    `windowLow=${formatNumber(windowLow)}`,
    `recentCloses=${recentCloses}`,
    'Use ONLY these verified numbers. Do not invent other prices or volumes.',
  ].join('\n');
}

function formatNumber(value: number): string {
  if (!Number.isFinite(value)) {
    return String(value);
  }
  return Number(value.toPrecision(8)).toString();
}
