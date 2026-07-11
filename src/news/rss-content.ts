import { createHash } from 'crypto';

export const MAX_TITLE_LENGTH = 500;
export const MAX_CONTENT_LENGTH = 50_000;
export const MAX_SOURCE_LENGTH = 255;
export const RSS_FETCH_TIMEOUT_MS = 15_000;

export function isAllowedHttpUrl(raw: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    return false;
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return false;
  }

  const host = parsed.hostname.toLowerCase();
  if (
    host === 'localhost' ||
    host === '127.0.0.1' ||
    host === '::1' ||
    host === '0.0.0.0' ||
    host.endsWith('.local') ||
    host.startsWith('169.254.') ||
    /^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[0-1])\.)/.test(host)
  ) {
    return false;
  }

  return true;
}

export function stripHtml(value: string): string {
  return value
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

export function truncate(value: string, maxLength: number): string {
  if (value.length <= maxLength) {
    return value;
  }
  return value.slice(0, maxLength);
}

export function sanitizeTitle(raw: string | undefined): string | null {
  if (!raw) {
    return null;
  }
  const cleaned = truncate(stripHtml(raw), MAX_TITLE_LENGTH);
  return cleaned.length > 0 ? cleaned : null;
}

export function sanitizeContent(raw: string | undefined): string | null {
  if (!raw) {
    return null;
  }
  const cleaned = truncate(stripHtml(raw), MAX_CONTENT_LENGTH);
  return cleaned.length > 0 ? cleaned : null;
}

export function sanitizeSource(raw: string): string {
  return truncate(stripHtml(raw), MAX_SOURCE_LENGTH) || 'unknown';
}

export function computeContentHash(input: {
  title: string;
  url: string;
  content: string | null;
}): string {
  const payload =
    input.content && input.content.length > 0
      ? input.content
      : `${input.title}|${input.url}`;
  return createHash('sha256').update(payload, 'utf8').digest('hex');
}

export function resolveSourceName(
  feedTitle: string | undefined,
  feedUrl: string,
): string {
  if (feedTitle?.trim()) {
    return sanitizeSource(feedTitle);
  }
  try {
    return sanitizeSource(new URL(feedUrl).hostname);
  } catch {
    return 'unknown';
  }
}

export function parsePublishedAt(
  isoDate: string | undefined,
  pubDate: string | undefined,
): Date | null {
  const raw = isoDate ?? pubDate;
  if (!raw) {
    return null;
  }
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date;
}
