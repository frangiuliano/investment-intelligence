import { AppLocale } from '../config/env.validation';
import { TELEGRAM_MAX_MESSAGE_LENGTH } from './telegram.constants';

export type TelegramAlertInput = {
  title: string;
  summary: string;
  sentiment: string;
  tickers: string[];
  url: string;
  /** Shown only when present and not `none`. */
  eventType?: string;
};

type TelegramMessageLabels = {
  alertHeader: string;
  title: string;
  summary: string;
  sentiment: string;
  eventType: string;
  tickers: string;
  url: string;
  noneTickers: string;
  testHeader: string;
  testBody: string;
};

const LABELS_BY_LOCALE: Record<AppLocale, TelegramMessageLabels> = {
  en: {
    alertHeader: 'Relevant news alert',
    title: 'Title',
    summary: 'Summary',
    sentiment: 'Sentiment',
    eventType: 'Event',
    tickers: 'Tickers',
    url: 'URL',
    noneTickers: '(none)',
    testHeader: 'Investment Intelligence — test notification',
    testBody: 'If you received this, Telegram is configured correctly.',
  },
  es: {
    alertHeader: 'Alerta de noticia relevante',
    title: 'Título',
    summary: 'Resumen',
    sentiment: 'Sentimiento',
    eventType: 'Evento',
    tickers: 'Tickers',
    url: 'URL',
    noneTickers: '(ninguno)',
    testHeader: 'Investment Intelligence — notificación de prueba',
    testBody:
      'Si recibiste este mensaje, Telegram está configurado correctamente.',
  },
};

export function formatTelegramAlert(
  input: TelegramAlertInput,
  locale: AppLocale = 'en',
): string {
  const labels = LABELS_BY_LOCALE[locale];
  const tickers =
    input.tickers.length > 0 ? input.tickers.join(', ') : labels.noneTickers;
  const eventType = normalizeEventTypeForDisplay(input.eventType);

  const lines = [
    labels.alertHeader,
    '',
    `${labels.title}: ${sanitizeField(input.title)}`,
    `${labels.summary}: ${sanitizeField(input.summary)}`,
    `${labels.sentiment}: ${sanitizeField(input.sentiment)}`,
  ];

  if (eventType) {
    lines.push(`${labels.eventType}: ${sanitizeField(eventType)}`);
  }

  lines.push(
    `${labels.tickers}: ${tickers}`,
    `${labels.url}: ${sanitizeField(input.url)}`,
  );

  const message = lines.join('\n');

  if (message.length <= TELEGRAM_MAX_MESSAGE_LENGTH) {
    return message;
  }

  return `${message.slice(0, TELEGRAM_MAX_MESSAGE_LENGTH - 1)}…`;
}

export function formatTelegramTestMessage(locale: AppLocale = 'en'): string {
  const labels = LABELS_BY_LOCALE[locale];
  return [labels.testHeader, '', labels.testBody].join('\n');
}

function normalizeEventTypeForDisplay(
  eventType: string | undefined,
): string | null {
  if (!eventType) {
    return null;
  }
  const normalized = eventType.trim().toLowerCase();
  if (!normalized || normalized === 'none') {
    return null;
  }
  return normalized;
}

function sanitizeField(value: string): string {
  return value.replace(/[\r\n\t]+/g, ' ').trim();
}
