import { HypothesisBias } from '../hypotheses/entities/hypothesis.entity';
import { HypothesisReviewOutcome } from './entities/hypothesis-review.entity';
import { OhlcvBar } from '../../market-data/market-data.types';

/** Absolute % move treated as a meaningful directional signal (not noise). */
export const MATERIAL_RETURN_PCT = 5;

export type PriceWindow = {
  startClose: number;
  endClose: number;
  startDay: string;
  endDay: string;
  returnPct: number;
};

export type ReviewClassification = {
  outcome: HypothesisReviewOutcome;
  priceReturnPct: number | null;
  priceStart: number | null;
  priceEnd: number | null;
  thesisQualityNote: string;
  timingNote: string;
  learningNote: string;
  explanation: string;
};

function toUtcDay(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function addDaysUtc(date: Date, days: number): Date {
  const result = new Date(date.getTime());
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

export function findCloseOnOrBefore(
  bars: OhlcvBar[],
  day: string,
): OhlcvBar | null {
  let match: OhlcvBar | null = null;
  for (const bar of bars) {
    if (bar.time <= day) {
      match = bar;
    } else {
      break;
    }
  }
  return match;
}

export function findCloseOnOrAfter(
  bars: OhlcvBar[],
  day: string,
): OhlcvBar | null {
  for (const bar of bars) {
    if (bar.time >= day) {
      return bar;
    }
  }
  return null;
}

export function resolvePriceWindow(
  bars: OhlcvBar[],
  start: Date,
  end: Date,
): PriceWindow | null {
  if (bars.length === 0 || end < start) {
    return null;
  }

  const startDay = toUtcDay(start);
  const endDay = toUtcDay(end);
  const startBar =
    findCloseOnOrAfter(bars, startDay) ?? findCloseOnOrBefore(bars, startDay);
  const endBar =
    findCloseOnOrBefore(bars, endDay) ?? findCloseOnOrAfter(bars, endDay);

  if (!startBar || !endBar || startBar.close <= 0) {
    return null;
  }

  const returnPct = ((endBar.close - startBar.close) / startBar.close) * 100;

  return {
    startClose: startBar.close,
    endClose: endBar.close,
    startDay: startBar.time,
    endDay: endBar.time,
    returnPct,
  };
}

function directionalSignal(
  bias: HypothesisBias,
  returnPct: number,
): 'aligned' | 'against' | 'flat' {
  if (Math.abs(returnPct) < MATERIAL_RETURN_PCT) {
    return 'flat';
  }

  if (bias === HypothesisBias.WATCH) {
    return 'aligned';
  }

  const bullishMove = returnPct >= MATERIAL_RETURN_PCT;
  const bearishMove = returnPct <= -MATERIAL_RETURN_PCT;

  if (bias === HypothesisBias.BULLISH) {
    if (bullishMove) {
      return 'aligned';
    }
    if (bearishMove) {
      return 'against';
    }
    return 'flat';
  }

  if (bearishMove) {
    return 'aligned';
  }
  if (bullishMove) {
    return 'against';
  }
  return 'flat';
}

export function classifyHypothesisReview(input: {
  bias: HypothesisBias;
  horizonDays: number;
  createdAt: Date;
  closedAt: Date | null;
  evaluationEnd: Date;
  bars: OhlcvBar[] | null;
  priceUnavailableReason?: string | null;
}): ReviewClassification {
  const horizonEnd = addDaysUtc(input.createdAt, input.horizonDays);
  const evalEnd =
    input.closedAt && input.closedAt < input.evaluationEnd
      ? input.closedAt
      : input.evaluationEnd;

  if (!input.bars || input.bars.length === 0) {
    const reason =
      input.priceUnavailableReason?.trim() || 'market_data_unavailable';
    return {
      outcome: HypothesisReviewOutcome.INCONCLUSIVE,
      priceReturnPct: null,
      priceStart: null,
      priceEnd: null,
      thesisQualityNote:
        'Price data was unavailable, so thesis quality cannot be scored from market moves. Re-read the written thesis and invalidation qualitatively.',
      timingNote: `Declared horizon was ${input.horizonDays} day(s). Numerical timing vs price could not be checked.`,
      learningNote:
        'Record a manual qualitative judgment later if you know whether the catalyst or invalidation fired.',
      explanation: `Numerical performance is unavailable (${reason}). Qualitative evaluation only — this is not a backtest and not investment advice.`,
    };
  }

  const atEval = resolvePriceWindow(input.bars, input.createdAt, evalEnd);
  if (!atEval) {
    return {
      outcome: HypothesisReviewOutcome.INCONCLUSIVE,
      priceReturnPct: null,
      priceStart: null,
      priceEnd: null,
      thesisQualityNote:
        'OHLCV bars did not cover the hypothesis window, so thesis quality vs price is inconclusive.',
      timingNote: `Horizon ${input.horizonDays} day(s) could not be checked against closes in range.`,
      learningNote:
        'Widen market-data history or re-run when bars cover the thesis dates.',
      explanation:
        'Numerical performance is unavailable (insufficient bars for the review window). Qualitative evaluation only — this is not a backtest and not investment advice.',
    };
  }

  const atHorizon =
    evalEnd.getTime() > horizonEnd.getTime()
      ? resolvePriceWindow(input.bars, input.createdAt, horizonEnd)
      : atEval;

  const signalAtEval = directionalSignal(input.bias, atEval.returnPct);
  const signalAtHorizon = atHorizon
    ? directionalSignal(input.bias, atHorizon.returnPct)
    : signalAtEval;

  let outcome: HypothesisReviewOutcome;
  if (
    evalEnd.getTime() > horizonEnd.getTime() &&
    signalAtHorizon !== 'aligned' &&
    signalAtEval === 'aligned'
  ) {
    outcome = HypothesisReviewOutcome.TIMING_ISSUE;
  } else if (signalAtEval === 'aligned') {
    outcome = HypothesisReviewOutcome.THESIS_CONFIRMED;
  } else if (signalAtEval === 'against') {
    outcome = HypothesisReviewOutcome.THESIS_REJECTED;
  } else {
    outcome = HypothesisReviewOutcome.INCONCLUSIVE;
  }

  const returnLabel = `${atEval.returnPct.toFixed(2)}%`;
  const biasLabel = input.bias;

  return {
    outcome,
    priceReturnPct: Number(atEval.returnPct.toFixed(4)),
    priceStart: atEval.startClose,
    priceEnd: atEval.endClose,
    thesisQualityNote: buildThesisQualityNote(outcome, biasLabel, returnLabel),
    timingNote: buildTimingNote(
      outcome,
      input.horizonDays,
      toUtcDay(horizonEnd),
      toUtcDay(evalEnd),
    ),
    learningNote: buildLearningNote(outcome),
    explanation: buildExplanation(outcome, biasLabel, returnLabel, atEval),
  };
}

function buildThesisQualityNote(
  outcome: HypothesisReviewOutcome,
  bias: string,
  returnLabel: string,
): string {
  switch (outcome) {
    case HypothesisReviewOutcome.THESIS_CONFIRMED:
      return `Price moved ${returnLabel} in a direction compatible with a ${bias} thesis (proxy only — catalysts were not verified).`;
    case HypothesisReviewOutcome.THESIS_REJECTED:
      return `Price moved ${returnLabel} against a ${bias} thesis (proxy only). Re-check written invalidation before calling the idea wrong.`;
    case HypothesisReviewOutcome.TIMING_ISSUE:
      return `Direction eventually matched a ${bias} thesis (${returnLabel} at evaluation), but not inside the declared horizon.`;
    default:
      return `Price move ${returnLabel} was too small or ambiguous vs a ${bias} thesis to judge thesis quality from price alone.`;
  }
}

function buildTimingNote(
  outcome: HypothesisReviewOutcome,
  horizonDays: number,
  horizonDay: string,
  evalDay: string,
): string {
  switch (outcome) {
    case HypothesisReviewOutcome.TIMING_ISSUE:
      return `Horizon ended ${horizonDay} (${horizonDays} day(s)); evaluation used ${evalDay}. Alignment appeared after the horizon.`;
    case HypothesisReviewOutcome.THESIS_CONFIRMED:
      return `Evaluated through ${evalDay} within/around a ${horizonDays}-day horizon ending ${horizonDay}.`;
    case HypothesisReviewOutcome.THESIS_REJECTED:
      return `Within the review window ending ${evalDay} (horizon ${horizonDays} day(s) → ${horizonDay}), price disagreed with the bias.`;
    default:
      return `Horizon ${horizonDays} day(s) (ends ${horizonDay}); evaluation day ${evalDay}. Timing inconclusive from price.`;
  }
}

function buildLearningNote(outcome: HypothesisReviewOutcome): string {
  switch (outcome) {
    case HypothesisReviewOutcome.THESIS_CONFIRMED:
      return 'What would you keep next time: clearer invalidation, same horizon, or tighter catalysts?';
    case HypothesisReviewOutcome.THESIS_REJECTED:
      return 'What would you change: thesis logic, invalidation trigger, or position sizing discipline — without treating this as a trading rule.';
    case HypothesisReviewOutcome.TIMING_ISSUE:
      return 'Consider whether the horizon was realistic for the catalyst you named.';
    default:
      return 'If the catalyst never fired, prefer inconclusive over rewriting history from P&L.';
  }
}

function buildExplanation(
  outcome: HypothesisReviewOutcome,
  bias: string,
  returnLabel: string,
  window: PriceWindow,
): string {
  return [
    `Outcome=${outcome} for bias=${bias}.`,
    `Close-to-close return ${returnLabel} from ${window.startDay} (${window.startClose}) to ${window.endDay} (${window.endClose}).`,
    `Material move threshold=±${MATERIAL_RETURN_PCT}%.`,
    'This is an honest research review using price as a proxy, not a scientific backtest, edge proof, or investment advice.',
  ].join(' ');
}
