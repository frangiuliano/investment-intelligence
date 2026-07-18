import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MarketSeries } from '../market-data/market-data.types';
import { buildTechnicalChartModel } from './chart-marks';
import { CHART_RENDERER_PORT } from './chart-renderer.port';
import type { ChartRendererPort } from './chart-renderer.port';

@Injectable()
export class TechnicalChartService {
  constructor(
    private readonly configService: ConfigService,
    @Inject(CHART_RENDERER_PORT)
    private readonly chartRenderer: ChartRendererPort,
  ) {}

  isEnabled(): boolean {
    return this.configService.getOrThrow<boolean>('technicalChart.enabled');
  }

  renderTechnicalChart(series: MarketSeries): Buffer {
    const model = buildTechnicalChartModel(series, {
      smaPeriods: this.configService.getOrThrow<number[]>(
        'technicalChart.smaPeriods',
      ),
      maxBars: this.configService.getOrThrow<number>('technicalChart.maxBars'),
    });
    return this.chartRenderer.render(model);
  }
}
