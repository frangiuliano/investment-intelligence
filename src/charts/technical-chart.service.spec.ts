import { ConfigService } from '@nestjs/config';
import { MarketSeries } from '../market-data/market-data.types';
import { TechnicalChartModel } from './chart-marks';
import { ChartRendererPort } from './chart-renderer.port';
import { TechnicalChartService } from './technical-chart.service';

const seriesFixture: MarketSeries = {
  symbol: 'AAPL',
  timeframe: '1d',
  asOf: '2026-07-17T15:00:00.000Z',
  source: 'yahoo-finance-chart',
  bars: Array.from({ length: 10 }, (_, index) => ({
    time: `2026-07-${String(index + 1).padStart(2, '0')}`,
    open: 99 + index,
    high: 102 + index,
    low: 97 + index,
    close: 100 + index,
    volume: 1_000,
  })),
};

describe('TechnicalChartService', () => {
  function createService(config: {
    enabled: boolean;
    smaPeriods?: number[];
    maxBars?: number;
  }) {
    const configService = {
      getOrThrow: jest.fn((key: string) => {
        if (key === 'technicalChart.enabled') {
          return config.enabled;
        }
        if (key === 'technicalChart.smaPeriods') {
          return config.smaPeriods ?? [20];
        }
        if (key === 'technicalChart.maxBars') {
          return config.maxBars ?? 90;
        }
        throw new Error(`unexpected config key ${key}`);
      }),
    } as unknown as ConfigService;

    const render = jest.fn().mockReturnValue(Buffer.from('png-bytes'));
    const renderer: ChartRendererPort = { render };

    return {
      service: new TechnicalChartService(configService, renderer),
      render,
    };
  }

  it('reports the feature gate from config', () => {
    expect(createService({ enabled: true }).service.isEnabled()).toBe(true);
    expect(createService({ enabled: false }).service.isEnabled()).toBe(false);
  });

  it('builds the model from config and delegates to the renderer port', () => {
    const { service, render } = createService({
      enabled: true,
      smaPeriods: [3],
      maxBars: 5,
    });

    const png = service.renderTechnicalChart(seriesFixture);

    expect(png).toEqual(Buffer.from('png-bytes'));
    expect(render).toHaveBeenCalledTimes(1);
    const [model] = render.mock.calls[0] as [TechnicalChartModel];
    expect(model.symbol).toBe('AAPL');
    expect(model.bars).toHaveLength(5);
    expect(model.smaOverlays[0].period).toBe(3);
  });

  it('propagates model errors so the caller can degrade gracefully', () => {
    const { service } = createService({ enabled: true });

    expect(() =>
      service.renderTechnicalChart({ ...seriesFixture, bars: [] }),
    ).toThrow('empty series');
  });
});
