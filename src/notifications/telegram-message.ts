import { TELEGRAM_MAX_MESSAGE_LENGTH } from './telegram.constants';

export type TelegramAlertInput = {
  title: string;
  summary: string;
  sentiment: string;
  tickers: string[];
  url: string;
};

export function formatTelegramAlert(input: TelegramAlertInput): string {
  const tickers =
    input.tickers.length > 0 ? input.tickers.join(', ') : '(none)';

  const message = [
    'Relevant news alert',
    '',
    `Title: ${sanitizeField(input.title)}`,
    `Summary: ${sanitizeField(input.summary)}`,
    `Sentiment: ${sanitizeField(input.sentiment)}`,
    `Tickers: ${tickers}`,
    `URL: ${sanitizeField(input.url)}`,
  ].join('\n');

  if (message.length <= TELEGRAM_MAX_MESSAGE_LENGTH) {
    return message;
  }

  return `${message.slice(0, TELEGRAM_MAX_MESSAGE_LENGTH - 1)}…`;
}

export function formatTelegramTestMessage(): string {
  return [
    'Investment Intelligence — test notification',
    '',
    'If you received this, Telegram is configured correctly.',
  ].join('\n');
}

function sanitizeField(value: string): string {
  return value.replace(/[\r\n\t]+/g, ' ').trim();
}
