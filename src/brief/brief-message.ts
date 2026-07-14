import { AppLocale } from '../config/env.validation';
import { TELEGRAM_MAX_MESSAGE_LENGTH } from '../notifications/telegram.constants';
import { BriefHoldingContext, BriefSections } from './brief.types';

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
      'You have a recorded position in this ticker. This is context only — not a sell or reduce instruction.',
    noLivePrices:
      'No live market quotes are attached to this brief. Do not treat any numbers as verified prices.',
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
      'Tenés una posición registrada en este ticker. Es solo contexto — no es una instrucción de venta ni de reducción.',
    noLivePrices:
      'Este brief no incluye cotizaciones en vivo. No trates ningún número como precio verificado.',
  },
};

export type FormatBriefInput = {
  symbol: string;
  sections: BriefSections;
  holding: BriefHoldingContext | null;
};

export function formatBriefMessage(
  input: FormatBriefInput,
  locale: AppLocale,
): string {
  const labels = LABELS_BY_LOCALE[locale];
  const lines = [
    `${labels.header}: ${input.symbol}`,
    '',
    labels.noLivePrices,
    '',
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
  ];

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

  lines.push('', `${labels.disclaimer}:`, input.sections.disclaimer);

  return truncateMessage(lines.join('\n'));
}

export function formatBriefHelpMessage(locale: AppLocale): string {
  if (locale === 'es') {
    return [
      'Comandos disponibles:',
      '/brief TICKER — brief educativo (TA/FA) sin señales de comprá/vendé',
      '/help — esta ayuda',
      '',
      'Límites: sin cotización en vivo en v1; no es asesoramiento de inversión.',
    ].join('\n');
  }

  return [
    'Available commands:',
    '/brief TICKER — educational TA/FA brief (no buy/sell instructions)',
    '/help — this help',
    '',
    'Limits: no live quotes in v1; not investment advice.',
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

export function formatBriefUsageMessage(locale: AppLocale): string {
  return locale === 'es'
    ? 'Uso: /brief TICKER (ej. /brief AAPL)'
    : 'Usage: /brief TICKER (e.g. /brief AAPL)';
}

function truncateMessage(text: string): string {
  if (text.length <= TELEGRAM_MAX_MESSAGE_LENGTH) {
    return text;
  }
  return `${text.slice(0, TELEGRAM_MAX_MESSAGE_LENGTH - 1)}…`;
}
