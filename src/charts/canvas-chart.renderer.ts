import { Injectable } from '@nestjs/common';
import { createCanvas, SKRSContext2D } from '@napi-rs/canvas';
import { ChartRendererPort } from './chart-renderer.port';
import { SmaOverlay, TechnicalChartModel } from './chart-marks';

const CHART_WIDTH = 1280;
const CHART_HEIGHT = 720;
const MARGIN = { top: 64, right: 96, bottom: 56, left: 24 };
const BULL_COLOR = '#16a34a';
const BEAR_COLOR = '#dc2626';
const SMA_COLORS = ['#2563eb', '#d97706', '#7c3aed'];
const GRID_COLOR = '#e5e7eb';
const TEXT_COLOR = '#374151';
const LEVEL_COLOR = '#6b7280';
const LAST_CLOSE_COLOR = '#111827';
const X_TICK_TARGET = 6;

type PlotArea = {
  x: number;
  y: number;
  width: number;
  height: number;
};

/**
 * Thin raster adapter: paints values pre-computed in chart-marks.ts with the
 * Canvas 2D API. No market math happens here.
 */
@Injectable()
export class CanvasChartRenderer implements ChartRendererPort {
  render(model: TechnicalChartModel): Buffer {
    const canvas = createCanvas(CHART_WIDTH, CHART_HEIGHT);
    const context = canvas.getContext('2d');
    const plot: PlotArea = {
      x: MARGIN.left,
      y: MARGIN.top,
      width: CHART_WIDTH - MARGIN.left - MARGIN.right,
      height: CHART_HEIGHT - MARGIN.top - MARGIN.bottom,
    };

    this.paintBackground(context);
    this.paintTitle(context, model);
    this.paintPriceGrid(context, model, plot);
    this.paintTimeAxis(context, model, plot);
    this.paintCandles(context, model, plot);
    this.paintSmaOverlays(context, model, plot);
    this.paintLevels(context, model, plot);
    this.paintFooter(context, model);

    return canvas.toBuffer('image/png');
  }

  private paintBackground(context: SKRSContext2D): void {
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, CHART_WIDTH, CHART_HEIGHT);
  }

  private paintTitle(context: SKRSContext2D, model: TechnicalChartModel): void {
    context.fillStyle = TEXT_COLOR;
    context.font = 'bold 24px sans-serif';
    context.textAlign = 'left';
    context.textBaseline = 'top';
    context.fillText(
      `${model.symbol} · ${model.timeframe} · ${model.bars.length} bars`,
      MARGIN.left,
      16,
    );

    const legend = model.smaOverlays
      .map((overlay, index) => ({
        label: `SMA ${overlay.period}`,
        color: SMA_COLORS[index % SMA_COLORS.length],
      }))
      .filter((entry) => entry.label.length > 0);

    context.font = '16px sans-serif';
    let legendX = CHART_WIDTH - MARGIN.right;
    for (const entry of [...legend].reverse()) {
      context.textAlign = 'right';
      context.fillStyle = entry.color;
      context.fillText(entry.label, legendX, 22);
      legendX -= context.measureText(entry.label).width + 24;
    }
  }

  private paintPriceGrid(
    context: SKRSContext2D,
    model: TechnicalChartModel,
    plot: PlotArea,
  ): void {
    const gridLines = 5;
    context.font = '14px sans-serif';
    context.textAlign = 'left';
    context.textBaseline = 'middle';

    for (let step = 0; step <= gridLines; step += 1) {
      const ratio = step / gridLines;
      const price =
        model.priceRange.max -
        ratio * (model.priceRange.max - model.priceRange.min);
      const y = plot.y + ratio * plot.height;

      context.strokeStyle = GRID_COLOR;
      context.lineWidth = 1;
      context.beginPath();
      context.moveTo(plot.x, y);
      context.lineTo(plot.x + plot.width, y);
      context.stroke();

      context.fillStyle = TEXT_COLOR;
      context.fillText(formatPrice(price), plot.x + plot.width + 8, y);
    }
  }

  private paintTimeAxis(
    context: SKRSContext2D,
    model: TechnicalChartModel,
    plot: PlotArea,
  ): void {
    const barCount = model.bars.length;
    const stride = Math.max(1, Math.round(barCount / X_TICK_TARGET));

    context.fillStyle = TEXT_COLOR;
    context.font = '14px sans-serif';
    context.textAlign = 'center';
    context.textBaseline = 'top';

    for (let index = 0; index < barCount; index += stride) {
      const x = this.barCenterX(index, barCount, plot);
      context.fillText(model.bars[index].time, x, plot.y + plot.height + 10);
    }
  }

  private paintCandles(
    context: SKRSContext2D,
    model: TechnicalChartModel,
    plot: PlotArea,
  ): void {
    const barCount = model.bars.length;
    const slotWidth = plot.width / barCount;
    const bodyWidth = Math.max(1, Math.min(slotWidth * 0.6, 24));

    for (let index = 0; index < barCount; index += 1) {
      const bar = model.bars[index];
      const centerX = this.barCenterX(index, barCount, plot);
      const color = bar.close >= bar.open ? BULL_COLOR : BEAR_COLOR;

      context.strokeStyle = color;
      context.lineWidth = Math.max(1, bodyWidth * 0.12);
      context.beginPath();
      context.moveTo(centerX, this.priceToY(bar.high, model, plot));
      context.lineTo(centerX, this.priceToY(bar.low, model, plot));
      context.stroke();

      const openY = this.priceToY(bar.open, model, plot);
      const closeY = this.priceToY(bar.close, model, plot);
      const bodyTop = Math.min(openY, closeY);
      const bodyHeight = Math.max(1, Math.abs(closeY - openY));

      context.fillStyle = color;
      context.fillRect(centerX - bodyWidth / 2, bodyTop, bodyWidth, bodyHeight);
    }
  }

  private paintSmaOverlays(
    context: SKRSContext2D,
    model: TechnicalChartModel,
    plot: PlotArea,
  ): void {
    model.smaOverlays.forEach((overlay, overlayIndex) => {
      this.paintSmaLine(
        context,
        overlay,
        SMA_COLORS[overlayIndex % SMA_COLORS.length],
        model,
        plot,
      );
    });
  }

  private paintSmaLine(
    context: SKRSContext2D,
    overlay: SmaOverlay,
    color: string,
    model: TechnicalChartModel,
    plot: PlotArea,
  ): void {
    context.strokeStyle = color;
    context.lineWidth = 2;
    context.beginPath();

    let started = false;
    for (let index = 0; index < overlay.values.length; index += 1) {
      const value = overlay.values[index];
      if (value === null) {
        continue;
      }
      const x = this.barCenterX(index, model.bars.length, plot);
      const y = this.priceToY(value, model, plot);
      if (started) {
        context.lineTo(x, y);
      } else {
        context.moveTo(x, y);
        started = true;
      }
    }

    if (started) {
      context.stroke();
    }
  }

  private paintLevels(
    context: SKRSContext2D,
    model: TechnicalChartModel,
    plot: PlotArea,
  ): void {
    const levels = [
      { label: 'High', value: model.levels.windowHigh, color: LEVEL_COLOR },
      { label: 'Low', value: model.levels.windowLow, color: LEVEL_COLOR },
      {
        label: 'Close',
        value: model.levels.lastClose,
        color: LAST_CLOSE_COLOR,
      },
    ];

    context.font = '13px sans-serif';
    context.textAlign = 'left';
    context.textBaseline = 'bottom';

    for (const level of levels) {
      const y = this.priceToY(level.value, model, plot);

      context.strokeStyle = level.color;
      context.lineWidth = 1;
      context.setLineDash([6, 6]);
      context.beginPath();
      context.moveTo(plot.x, y);
      context.lineTo(plot.x + plot.width, y);
      context.stroke();
      context.setLineDash([]);

      context.fillStyle = level.color;
      context.fillText(
        `${level.label} ${formatPrice(level.value)}`,
        plot.x + 8,
        y - 4,
      );
    }
  }

  private paintFooter(
    context: SKRSContext2D,
    model: TechnicalChartModel,
  ): void {
    context.fillStyle = LEVEL_COLOR;
    context.font = '13px sans-serif';
    context.textAlign = 'left';
    context.textBaseline = 'bottom';
    context.fillText(
      `source=${model.source} · asOf=${model.asOf} · illustrative research chart, not advice`,
      MARGIN.left,
      CHART_HEIGHT - 10,
    );
  }

  private barCenterX(index: number, barCount: number, plot: PlotArea): number {
    const slotWidth = plot.width / barCount;
    return plot.x + slotWidth * index + slotWidth / 2;
  }

  private priceToY(
    price: number,
    model: TechnicalChartModel,
    plot: PlotArea,
  ): number {
    const { min, max } = model.priceRange;
    const ratio = (max - price) / (max - min);
    return plot.y + ratio * plot.height;
  }
}

function formatPrice(value: number): string {
  if (!Number.isFinite(value)) {
    return String(value);
  }
  return Number(value.toPrecision(6)).toString();
}
