import { buildMarketFactsBlock } from './brief-market-facts';
import { MarketSeries } from '../market-data/market-data.types';
import { validateStanceForHolding } from './brief-stance';

describe('brief-market-facts', () => {
  it('builds a compact facts block only from MarketSeries numbers', () => {
    const series: MarketSeries = {
      symbol: 'AAPL',
      timeframe: '1d',
      asOf: '2026-07-17T15:00:00.000Z',
      source: 'yahoo-finance-chart',
      bars: [
        {
          time: '2026-01-02',
          open: 100,
          high: 110,
          low: 90,
          close: 100,
          volume: 10,
        },
        {
          time: '2026-07-16',
          open: 150,
          high: 160,
          low: 140,
          close: 150,
          volume: 20,
        },
      ],
    };

    const block = buildMarketFactsBlock(series);

    expect(block).toContain('source=yahoo-finance-chart');
    expect(block).toContain('windowCloseChangePct=50');
    expect(block).toContain('windowHigh=160');
    expect(block).toContain('windowLow=90');
    expect(block).toContain('2026-07-16=150');
    expect(block).toContain('Use ONLY these verified numbers');
  });
});

describe('brief-stance', () => {
  it('accepts stance enums that match holding presence', () => {
    expect(validateStanceForHolding('enter', false)).toBe('enter');
    expect(validateStanceForHolding('exit', true)).toBe('exit');
  });

  it('rejects stance enums that conflict with holding presence', () => {
    expect(validateStanceForHolding('exit', false)).toBeNull();
    expect(validateStanceForHolding('enter', true)).toBeNull();
    expect(validateStanceForHolding(null, false)).toBeNull();
  });
});
