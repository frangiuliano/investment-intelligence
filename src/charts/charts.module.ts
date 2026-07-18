import { Module } from '@nestjs/common';
import { CanvasChartRenderer } from './canvas-chart.renderer';
import { CHART_RENDERER_PORT } from './chart-renderer.port';
import { TechnicalChartService } from './technical-chart.service';

@Module({
  providers: [
    {
      provide: CHART_RENDERER_PORT,
      useClass: CanvasChartRenderer,
    },
    TechnicalChartService,
  ],
  exports: [TechnicalChartService],
})
export class ChartsModule {}
