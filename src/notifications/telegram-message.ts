import { AppLocale } from '../config/env.validation';
import { TELEGRAM_MAX_MESSAGE_LENGTH } from './telegram.constants';

export type TelegramAlertInput = {
  title: string;
  summary: string;
  sentiment: string;
  tickers: string[];
  url: string;
};

type TelegramMessageLabels = {
  alertHeader: string;
  title: string;
  summary: string;
  sentiment: string;
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

  const message = [
    labels.alertHeader,
    '',
    `${labels.title}: ${sanitizeField(input.title)}`,
    `${labels.summary}: ${sanitizeField(input.summary)}`,
    `${labels.sentiment}: ${sanitizeField(input.sentiment)}`,
    `${labels.tickers}: ${tickers}`,
    `${labels.url}: ${sanitizeField(input.url)}`,
  ].join('\n');

  if (message.length <= TELEGRAM_MAX_MESSAGE_LENGTH) {
    return message;
  }

  return `${message.slice(0, TELEGRAM_MAX_MESSAGE_LENGTH - 1)}…`;
}

export function formatTelegramTestMessage(locale: AppLocale = 'en'): string {
  const labels = LABELS_BY_LOCALE[locale];
  return [labels.testHeader, '', labels.testBody].join('\n');
}

function sanitizeField(value: string): string {
  return value.replace(/[\r\n\t]+/g, ' ').trim();
}
