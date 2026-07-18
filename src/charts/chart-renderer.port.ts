import { TechnicalChartModel } from './chart-marks';

export const CHART_RENDERER_PORT = Symbol('CHART_RENDERER_PORT');

export interface ChartRendererPort {
  /** Renders the pre-computed model into a PNG buffer. */
  render(model: TechnicalChartModel): Buffer;
}
