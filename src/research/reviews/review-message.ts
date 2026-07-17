import { AppLocale } from '../../config/env.validation';
import { TELEGRAM_MAX_MESSAGE_LENGTH } from '../../notifications/telegram.constants';
import { HypothesisReviewOutcome } from './entities/hypothesis-review.entity';

export type ReviewSummaryCounts = {
  reviewed: number;
  thesisConfirmed: number;
  thesisRejected: number;
  timingIssue: number;
  inconclusive: number;
  skipped: number;
};

export type ReviewSummaryItem = {
  symbol: string;
  outcome: HypothesisReviewOutcome;
  priceReturnPct: number | null;
};

const OUTCOME_LABELS: Record<
  AppLocale,
  Record<HypothesisReviewOutcome, string>
> = {
  en: {
    [HypothesisReviewOutcome.THESIS_CONFIRMED]: 'confirmed',
    [HypothesisReviewOutcome.THESIS_REJECTED]: 'rejected',
    [HypothesisReviewOutcome.TIMING_ISSUE]: 'timing',
    [HypothesisReviewOutcome.INCONCLUSIVE]: 'inconclusive',
  },
  es: {
    [HypothesisReviewOutcome.THESIS_CONFIRMED]: 'confirmada',
    [HypothesisReviewOutcome.THESIS_REJECTED]: 'rechazada',
    [HypothesisReviewOutcome.TIMING_ISSUE]: 'timing',
    [HypothesisReviewOutcome.INCONCLUSIVE]: 'inconclusa',
  },
};

export function formatReviewSummaryMessage(
  input: {
    periodStart: Date;
    periodEnd: Date;
    counts: ReviewSummaryCounts;
    items: ReviewSummaryItem[];
  },
  locale: AppLocale,
): string {
  const period = `${toUtcDay(input.periodStart)} → ${toUtcDay(input.periodEnd)}`;
  const labels = OUTCOME_LABELS[locale];

  const lines =
    locale === 'es'
      ? [
          'Review de hipótesis (research)',
          `Período: ${period}`,
          `Revisadas: ${input.counts.reviewed} · omitidas (horizonte): ${input.counts.skipped}`,
          `Confirmadas: ${input.counts.thesisConfirmed} · Rechazadas: ${input.counts.thesisRejected} · Timing: ${input.counts.timingIssue} · Inconclusas: ${input.counts.inconclusive}`,
          '',
          ...formatItemLines(input.items, labels, locale),
          '',
          patternLine(input.counts, locale),
          '',
          'Disclaimer: esto es un repaso de research, no un backtest científico ni asesoramiento de inversión. No garantiza aprendizaje automático del mercado ni resultados futuros.',
        ]
      : [
          'Hypothesis review (research)',
          `Period: ${period}`,
          `Reviewed: ${input.counts.reviewed} · skipped (horizon): ${input.counts.skipped}`,
          `Confirmed: ${input.counts.thesisConfirmed} · Rejected: ${input.counts.thesisRejected} · Timing: ${input.counts.timingIssue} · Inconclusive: ${input.counts.inconclusive}`,
          '',
          ...formatItemLines(input.items, labels, locale),
          '',
          patternLine(input.counts, locale),
          '',
          'Disclaimer: this is a research retrospective, not a scientific backtest or investment advice. It does not promise automated market learning or future results.',
        ];

  return truncateMessage(lines.join('\n'));
}

export function formatReviewEmptyMessage(
  periodStart: Date,
  periodEnd: Date,
  locale: AppLocale,
): string {
  const period = `${toUtcDay(periodStart)} → ${toUtcDay(periodEnd)}`;
  if (locale === 'es') {
    return [
      'Review de hipótesis',
      `Período: ${period}`,
      'No hay hipótesis listas para revisar (cerradas en el período o con horizonte vencido).',
      '',
      'Disclaimer: no es asesoramiento de inversión.',
    ].join('\n');
  }

  return [
    'Hypothesis review',
    `Period: ${period}`,
    'No hypotheses are due for review (closed in the period or horizon elapsed).',
    '',
    'Disclaimer: not investment advice.',
  ].join('\n');
}

export function formatReviewBusyMessage(locale: AppLocale): string {
  return locale === 'es'
    ? 'Ya hay un review en curso. Esperá a que termine e intentá de nuevo.'
    : 'A review run is already in progress. Wait for it to finish and try again.';
}

export function formatReviewErrorMessage(locale: AppLocale): string {
  return locale === 'es'
    ? 'No pude completar el review de hipótesis. Revisá logs o reintentá.'
    : 'Could not complete the hypothesis review. Check logs or try again.';
}

export function formatReviewUsageMessage(locale: AppLocale): string {
  return locale === 'es'
    ? 'Uso: /review — revisa el mes calendario UTC actual. Opcional: /review YYYY-MM'
    : 'Usage: /review — reviews the current UTC calendar month. Optional: /review YYYY-MM';
}

function formatItemLines(
  items: ReviewSummaryItem[],
  labels: Record<HypothesisReviewOutcome, string>,
  locale: AppLocale,
): string[] {
  if (items.length === 0) {
    return locale === 'es' ? ['(sin ítems)'] : ['(no items)'];
  }

  const limited = items.slice(0, 12);
  const lines = limited.map((item) => {
    const ret =
      item.priceReturnPct === null
        ? locale === 'es'
          ? 'sin %'
          : 'no %'
        : `${item.priceReturnPct >= 0 ? '+' : ''}${item.priceReturnPct.toFixed(2)}%`;
    return `• ${item.symbol}: ${labels[item.outcome]} (${ret})`;
  });

  if (items.length > limited.length) {
    lines.push(
      locale === 'es'
        ? `… y ${items.length - limited.length} más`
        : `… and ${items.length - limited.length} more`,
    );
  }

  return lines;
}

function patternLine(counts: ReviewSummaryCounts, locale: AppLocale): string {
  if (counts.reviewed === 0) {
    return locale === 'es'
      ? 'Patrón: sin datos suficientes este período.'
      : 'Pattern: not enough reviews this period.';
  }

  const dominant = [
    {
      key: 'confirmed',
      n: counts.thesisConfirmed,
    },
    { key: 'rejected', n: counts.thesisRejected },
    { key: 'timing', n: counts.timingIssue },
    { key: 'inconclusive', n: counts.inconclusive },
  ].sort((a, b) => b.n - a.n)[0];

  if (locale === 'es') {
    if (dominant.key === 'timing' && dominant.n > 0) {
      return 'Patrón tentativo: varias tesis con problema de horizonte — sin prometer mejora futura.';
    }
    if (dominant.key === 'inconclusive' && dominant.n > 0) {
      return 'Patrón tentativo: muchas evaluaciones inconclusas (datos o movimiento lateral).';
    }
    return 'Patrón tentativo: revisá los bullets de aprendizaje por tesis — sin prometer mejora futura.';
  }

  if (dominant.key === 'timing' && dominant.n > 0) {
    return 'Tentative pattern: several timing-horizon mismatches — no promise of future improvement.';
  }
  if (dominant.key === 'inconclusive' && dominant.n > 0) {
    return 'Tentative pattern: many inconclusive reviews (missing data or sideways price).';
  }
  return 'Tentative pattern: revisit per-thesis learning notes — no promise of future improvement.';
}

function toUtcDay(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function truncateMessage(text: string): string {
  if (text.length <= TELEGRAM_MAX_MESSAGE_LENGTH) {
    return text;
  }
  return `${text.slice(0, TELEGRAM_MAX_MESSAGE_LENGTH - 1)}…`;
}
