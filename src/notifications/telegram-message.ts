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

export type DigestItemInput = {
  title: string;
  summary: string;
  sentiment: string;
  materiality: string;
  tickers: string[];
  url: string;
  eventType?: string;
};

export type TelegramDigestInput = {
  lookbackHours: number;
  items: DigestItemInput[];
};

export type TelegramDigestResult = {
  message: string;
  /** Prefix length of `items` that fit in the sent message body. */
  includedCount: number;
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
  digestHeader: string;
  digestCount: string;
  materiality: string;
  digestMore: string;
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
    digestHeader: 'News digest',
    digestCount: 'items',
    materiality: 'Materiality',
    digestMore: 'more omitted',
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
    digestHeader: 'Digesto de noticias',
    digestCount: 'ítems',
    materiality: 'Materialidad',
    digestMore: 'más omitidos',
  },
};

/** Display labels for persisted EN codes; locale only affects Telegram copy. */
const SENTIMENT_DISPLAY_BY_LOCALE: Record<AppLocale, Record<string, string>> = {
  en: {
    positive: 'positive',
    negative: 'negative',
    neutral: 'neutral',
  },
  es: {
    positive: 'positivo',
    negative: 'negativo',
    neutral: 'neutral',
  },
};

const MATERIALITY_DISPLAY_BY_LOCALE: Record<
  AppLocale,
  Record<string, string>
> = {
  en: {
    low: 'low',
    medium: 'medium',
    high: 'high',
  },
  es: {
    low: 'baja',
    medium: 'media',
    high: 'alta',
  },
};

const EVENT_TYPE_DISPLAY_BY_LOCALE: Record<
  AppLocale,
  Record<string, string>
> = {
  en: {
    ipo: 'ipo',
    earnings: 'earnings',
    m_and_a: 'm_and_a',
    regulation: 'regulation',
    other: 'other',
  },
  es: {
    ipo: 'IPO',
    earnings: 'resultados',
    m_and_a: 'fusión/adquisición',
    regulation: 'regulación',
    other: 'otro',
  },
};

/** Prefer persisted localized headline; fall back to RSS title when blank. */
export function resolveTelegramTitle(
  headline: string | null | undefined,
  rssTitle: string,
): string {
  const trimmed = headline?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : rssTitle;
}

export function formatTelegramAlert(
  input: TelegramAlertInput,
  locale: AppLocale = 'en',
): string {
  const labels = LABELS_BY_LOCALE[locale];
  const tickers =
    input.tickers.length > 0 ? input.tickers.join(', ') : labels.noneTickers;
  const eventType = localizeEventTypeForDisplay(input.eventType, locale);

  const lines = [
    labels.alertHeader,
    '',
    `${labels.title}: ${sanitizeField(input.title)}`,
    `${labels.summary}: ${sanitizeField(input.summary)}`,
    `${labels.sentiment}: ${localizeSentiment(input.sentiment, locale)}`,
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

export function formatTelegramDigest(
  input: TelegramDigestInput,
  locale: AppLocale = 'en',
): TelegramDigestResult {
  const labels = LABELS_BY_LOCALE[locale];
  const header = [
    `${labels.digestHeader} (${input.lookbackHours}h)`,
    `${input.items.length} ${labels.digestCount}`,
    '',
  ].join('\n');

  const blocks: string[] = [];
  let included = 0;

  for (let index = 0; index < input.items.length; index += 1) {
    const item = input.items[index];
    const block = formatDigestItemBlock(item, index + 1, labels, locale);
    const remaining = input.items.length - (index + 1);
    const footer =
      remaining > 0 ? `\n\n(+${remaining} ${labels.digestMore})` : '';
    const candidate = [header, ...blocks, block].join('\n\n') + footer;

    if (candidate.length > TELEGRAM_MAX_MESSAGE_LENGTH) {
      break;
    }

    blocks.push(block);
    included += 1;
  }

  if (included === 0 && input.items.length > 0) {
    const first = formatDigestItemBlock(input.items[0], 1, labels, locale);
    const remaining = input.items.length - 1;
    const footer =
      remaining > 0 ? `\n\n(+${remaining} ${labels.digestMore})` : '';
    const message = header + first + footer;
    if (message.length <= TELEGRAM_MAX_MESSAGE_LENGTH) {
      return { message, includedCount: 1 };
    }
    return {
      message: `${message.slice(0, TELEGRAM_MAX_MESSAGE_LENGTH - 1)}…`,
      includedCount: 1,
    };
  }

  const omitted = input.items.length - included;
  const footer = omitted > 0 ? `\n\n(+${omitted} ${labels.digestMore})` : '';
  return {
    message: [header, ...blocks].join('\n\n') + footer,
    includedCount: included,
  };
}

export function formatTelegramTestMessage(locale: AppLocale = 'en'): string {
  const labels = LABELS_BY_LOCALE[locale];
  return [labels.testHeader, '', labels.testBody].join('\n');
}

function formatDigestItemBlock(
  item: DigestItemInput,
  index: number,
  labels: TelegramMessageLabels,
  locale: AppLocale,
): string {
  const tickers =
    item.tickers.length > 0 ? item.tickers.join(', ') : labels.noneTickers;
  const eventType = localizeEventTypeForDisplay(item.eventType, locale);
  const summary = truncateField(sanitizeField(item.summary), 160);
  const lines = [
    `${index}. ${sanitizeField(item.title)}`,
    `${labels.tickers}: ${tickers} · ${labels.materiality}: ${localizeMateriality(item.materiality, locale)} · ${labels.sentiment}: ${localizeSentiment(item.sentiment, locale)}`,
  ];
  if (eventType) {
    lines.push(`${labels.eventType}: ${sanitizeField(eventType)}`);
  }
  lines.push(summary, sanitizeField(item.url));
  return lines.join('\n');
}

function truncateField(value: string, maxLength: number): string {
  if (value.length <= maxLength) {
    return value;
  }
  return `${value.slice(0, maxLength - 1)}…`;
}

function localizeSentiment(sentiment: string, locale: AppLocale): string {
  const normalized = sentiment.trim().toLowerCase();
  return (
    SENTIMENT_DISPLAY_BY_LOCALE[locale][normalized] ?? sanitizeField(sentiment)
  );
}

function localizeMateriality(materiality: string, locale: AppLocale): string {
  const normalized = materiality.trim().toLowerCase();
  return (
    MATERIALITY_DISPLAY_BY_LOCALE[locale][normalized] ??
    sanitizeField(materiality)
  );
}

/**
 * Returns localized display text, or null when the event should be omitted
 * (`none` / missing). Unknown codes fall back to the raw normalized code.
 */
function localizeEventTypeForDisplay(
  eventType: string | undefined,
  locale: AppLocale,
): string | null {
  if (!eventType) {
    return null;
  }
  const normalized = eventType.trim().toLowerCase();
  if (!normalized || normalized === 'none') {
    return null;
  }
  return EVENT_TYPE_DISPLAY_BY_LOCALE[locale][normalized] ?? normalized;
}

function sanitizeField(value: string): string {
  return value.replace(/[\r\n\t]+/g, ' ').trim();
}
