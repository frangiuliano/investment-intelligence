import { createHash } from 'crypto';

export const MAX_TITLE_LENGTH = 500;
export const MAX_CONTENT_LENGTH = 50_000;
export const MAX_SOURCE_LENGTH = 255;
export const RSS_FETCH_TIMEOUT_MS = 15_000;
export const MAX_FEED_BYTES = 2_000_000;
export const MAX_FEED_REDIRECTS = 3;

const BLOCKED_HOSTNAMES = new Set([
  'localhost',
  'metadata.google.internal',
  'metadata.goog',
]);

export function isPrivateOrLocalHostname(host: string): boolean {
  const normalized = host.toLowerCase().replace(/^\[/, '').replace(/\]$/, '');

  if (BLOCKED_HOSTNAMES.has(normalized) || normalized.endsWith('.local')) {
    return true;
  }

  if (normalized.startsWith('::ffff:')) {
    const mapped = mappedIpv4FromIpv6(normalized.slice('::ffff:'.length));
    return mapped ? isPrivateOrLocalHostname(mapped) : true;
  }

  if (
    normalized === '::1' ||
    normalized === '0.0.0.0' ||
    normalized.startsWith('fe80:') ||
    /^(fc|fd)[0-9a-f]{0,2}:/i.test(normalized)
  ) {
    return true;
  }

  if (
    normalized === '127.0.0.1' ||
    normalized.startsWith('127.') ||
    normalized.startsWith('169.254.') ||
    /^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[0-1])\.)/.test(normalized)
  ) {
    return true;
  }

  return false;
}

function mappedIpv4FromIpv6(mapped: string): string | null {
  if (mapped.includes('.')) {
    return mapped;
  }

  const parts = mapped.split(':');
  if (parts.length !== 2) {
    return null;
  }

  const high = Number.parseInt(parts[0], 16);
  const low = Number.parseInt(parts[1], 16);
  if (Number.isNaN(high) || Number.isNaN(low)) {
    return null;
  }

  return `${(high >> 8) & 0xff}.${high & 0xff}.${(low >> 8) & 0xff}.${low & 0xff}`;
}

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

  return !isPrivateOrLocalHostname(parsed.hostname);
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

export function firstNonEmpty(
  ...values: Array<string | undefined | null>
): string | undefined {
  for (const value of values) {
    if (value?.trim()) {
      return value;
    }
  }
  return undefined;
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

export function resolveItemUrl(
  candidates: Array<string | undefined>,
): string | null {
  for (const candidate of candidates) {
    const trimmed = candidate?.trim();
    if (trimmed && isAllowedHttpUrl(trimmed)) {
      return trimmed;
    }
  }
  return null;
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
