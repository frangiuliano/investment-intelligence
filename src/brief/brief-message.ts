import { AppLocale } from '../config/env.validation';
import { TELEGRAM_MAX_MESSAGE_LENGTH } from '../notifications/telegram.constants';
import { BriefHoldingContext, BriefSections, BriefStance } from './brief.types';

type BriefMessageLabels = {
  header: string;
  overview: string;
  fundamental: string;
  technical: string;
  risks: string;
  invalidation: string;
  disclaimer: string;
  holdingContext: string;
  holdingPresent: string;
  noLivePrices: string;
  marketAttached: string;
  stance: string;
  stanceRationale: string;
  stanceUnavailable: string;
  researchHypothesisBanner: string;
};

const STANCE_LABELS: Record<AppLocale, Record<BriefStance, string>> = {
  en: {
    enter: 'Enter (research hypothesis)',
    avoid: 'Avoid (research hypothesis)',
    watch: 'Watch (research hypothesis)',
    hold: 'Hold (research hypothesis)',
    add: 'Add (research hypothesis)',
    reduce: 'Reduce (research hypothesis)',
    exit: 'Exit (research hypothesis)',
  },
  es: {
    enter: 'Entrar (hipótesis de research)',
    avoid: 'Evitar (hipótesis de research)',
    watch: 'Observar (hipótesis de research)',
    hold: 'Mantener (hipótesis de research)',
    add: 'Agregar (hipótesis de research)',
    reduce: 'Reducir (hipótesis de research)',
    exit: 'Salir (hipótesis de research)',
  },
};

const LABELS_BY_LOCALE: Record<AppLocale, BriefMessageLabels> = {
  en: {
    header: 'Educational research brief',
    overview: 'Overview',
    fundamental: 'Fundamentals to review',
    technical: 'Technical lens',
    risks: 'Risks',
    invalidation: 'What would invalidate the thesis',
    disclaimer: 'Disclaimer',
    holdingContext: 'Holdings context',
    holdingPresent:
      'You have a recorded position in this ticker. Any stance below is relative to that position — a research hypothesis, not a broker order.',
    noLivePrices:
      'No live market quotes are attached to this brief. Stance was not issued. Do not treat any numbers as verified prices.',
    marketAttached: 'Market data attached from provider',
    stance: 'Research stance',
    stanceRationale: 'Stance rationale',
    stanceUnavailable:
      'A labeled stance could not be validated for this brief. Educational sections only — no invented posture.',
    researchHypothesisBanner:
      'Labeled stance is a research hypothesis for the operator only. Not investment advice. Not a broker order.',
  },
  es: {
    header: 'Brief educativo de research',
    overview: 'Overview',
    fundamental: 'Fundamentales a revisar',
    technical: 'Lente técnico',
    risks: 'Riesgos',
    invalidation: 'Qué invalidaría la tesis',
    disclaimer: 'Disclaimer',
    holdingContext: 'Contexto de cartera',
    holdingPresent:
      'Tenés una posición registrada en este ticker. Cualquier postura abajo es relativa a esa posición — hipótesis de research, no una orden de broker.',
    noLivePrices:
      'Este brief no incluye cotizaciones en vivo. No se emitió postura. No trates ningún número como precio verificado.',
    marketAttached: 'Datos de mercado adjuntos del proveedor',
    stance: 'Postura de research',
    stanceRationale: 'Justificación de la postura',
    stanceUnavailable:
      'No se pudo validar una postura etiquetada para este brief. Solo secciones educativas — sin postura inventada.',
    researchHypothesisBanner:
      'La postura etiquetada es una hipótesis de research para el operador. No es asesoramiento de inversión ni una orden de broker.',
  },
};

export type FormatBriefInput = {
  symbol: string;
  sections: BriefSections;
  holding: BriefHoldingContext | null;
  stance: BriefStance | null;
  stanceRationale: string | null;
  marketSource: string | null;
  marketAsOf: Date | null;
};

export function formatBriefMessage(
  input: FormatBriefInput,
  locale: AppLocale,
): string {
  const labels = LABELS_BY_LOCALE[locale];
  const footer = buildDisclaimerFooter(input, labels);
  const body = buildBriefBody(input, labels, locale);
  return joinBodyWithReservedFooter(body, footer);
}

export function formatBriefHelpMessage(locale: AppLocale): string {
  if (locale === 'es') {
    return [
      'Comandos disponibles:',
      '/brief TICKER — brief educativo (TA/FA) con postura etiquetada si hay market data (no es orden de broker)',
      '/review [YYYY-MM] — review de hipótesis del mes (UTC)',
      '/help — esta ayuda',
      '',
      'Límites: research only; no es asesoramiento de inversión ni backtest científico.',
    ].join('\n');
  }

  return [
    'Available commands:',
    '/brief TICKER — educational TA/FA brief with labeled stance when market data is available (not a broker order)',
    '/review [YYYY-MM] — hypothesis review for the UTC calendar month',
    '/help — this help',
    '',
    'Limits: research only; not investment advice or a scientific backtest.',
  ].join('\n');
}

export function formatBriefBusyMessage(locale: AppLocale): string {
  return locale === 'es'
    ? 'Ya hay un brief en curso. Esperá a que termine e intentá de nuevo.'
    : 'A brief is already in progress. Wait for it to finish and try again.';
}

export function formatBriefErrorMessage(locale: AppLocale): string {
  return locale === 'es'
    ? 'No pude generar el brief. Revisá logs o reintentá en unos minutos.'
    : 'Could not generate the brief. Check logs or try again in a few minutes.';
}

export function formatBriefDeliveryErrorMessage(locale: AppLocale): string {
  return locale === 'es'
    ? 'El brief se generó y guardó, pero falló el envío a Telegram. Revisá logs o pedilo de nuevo.'
    : 'The brief was generated and saved, but Telegram delivery failed. Check logs or request it again.';
}

export function formatBriefUsageMessage(locale: AppLocale): string {
  return locale === 'es'
    ? 'Uso: /brief TICKER (ej. /brief AAPL)'
    : 'Usage: /brief TICKER (e.g. /brief AAPL)';
}

export function formatBriefChartCaption(
  symbol: string,
  locale: AppLocale,
): string {
  return locale === 'es'
    ? `${symbol} — velas diarias con SMA, máximo/mínimo de la ventana y último cierre. Chart ilustrativo de research desde OHLCV verificado. No es asesoramiento de inversión.`
    : `${symbol} — daily candles with SMA, window high/low and last close. Illustrative research chart from verified OHLCV. Not investment advice.`;
}

export function formatBriefChartUnavailableMessage(locale: AppLocale): string {
  return locale === 'es'
    ? 'El brief se entregó, pero no se pudo generar o enviar la imagen del chart técnico. Revisá logs.'
    : 'The brief was delivered, but the technical chart image could not be generated or sent. Check logs.';
}

function buildDisclaimerFooter(
  input: FormatBriefInput,
  labels: BriefMessageLabels,
): string {
  const lines = [`${labels.disclaimer}:`, input.sections.disclaimer];
  if (input.stance) {
    lines.push('', labels.researchHypothesisBanner);
  }
  return lines.join('\n');
}

function buildBriefBody(
  input: FormatBriefInput,
  labels: BriefMessageLabels,
  locale: AppLocale,
): string {
  const lines = [`${labels.header}: ${input.symbol}`, ''];

  if (input.stance) {
    lines.push(labels.researchHypothesisBanner, '');
    lines.push(`${labels.stance}: ${STANCE_LABELS[locale][input.stance]}`);
    if (input.stanceRationale) {
      lines.push(`${labels.stanceRationale}:`, input.stanceRationale);
    }
    if (input.marketSource) {
      const asOf =
        input.marketAsOf instanceof Date ? input.marketAsOf.toISOString() : '';
      lines.push(
        `${labels.marketAttached}: ${input.marketSource}${
          asOf ? ` @ ${asOf}` : ''
        }`,
      );
    }
    lines.push('');
  } else {
    lines.push(
      input.marketSource ? labels.stanceUnavailable : labels.noLivePrices,
      '',
    );
  }

  lines.push(
    `${labels.overview}:`,
    input.sections.overview,
    '',
    `${labels.fundamental}:`,
    input.sections.fundamental,
    '',
    `${labels.technical}:`,
    input.sections.technical,
    '',
    `${labels.risks}:`,
    input.sections.risks,
    '',
    `${labels.invalidation}:`,
    input.sections.invalidation,
  );

  if (input.holding) {
    lines.push(
      '',
      `${labels.holdingContext}:`,
      labels.holdingPresent,
      `assetTypes: ${input.holding.assetTypes.join(', ') || '(none)'}`,
    );
    if (input.holding.notes) {
      lines.push(`notes: ${input.holding.notes}`);
    }
  }

  return lines.join('\n');
}

function joinBodyWithReservedFooter(body: string, footer: string): string {
  const separator = '\n\n';
  const reserved = footer.length + separator.length;
  const maxBodyLength = TELEGRAM_MAX_MESSAGE_LENGTH - reserved;

  if (maxBodyLength <= 0) {
    return truncateToLimit(footer);
  }

  const fittedBody =
    body.length <= maxBodyLength
      ? body
      : `${body.slice(0, Math.max(0, maxBodyLength - 1))}…`;

  return `${fittedBody}${separator}${footer}`;
}

function truncateToLimit(text: string): string {
  if (text.length <= TELEGRAM_MAX_MESSAGE_LENGTH) {
    return text;
  }
  return `${text.slice(0, TELEGRAM_MAX_MESSAGE_LENGTH - 1)}…`;
}
