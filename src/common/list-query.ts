import { BadRequestException } from '@nestjs/common';

export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

export type Paginated<T> = {
  items: T[];
  page: number;
  limit: number;
  total: number;
};

export function parsePage(page?: number): number {
  if (page === undefined) {
    return 1;
  }
  if (!Number.isInteger(page) || page < 1) {
    throw new BadRequestException('page must be a positive integer');
  }
  return page;
}

export function parseLimit(limit?: number): number {
  if (limit === undefined) {
    return DEFAULT_PAGE_SIZE;
  }
  if (!Number.isInteger(limit) || limit < 1 || limit > MAX_PAGE_SIZE) {
    throw new BadRequestException(
      `limit must be an integer between 1 and ${MAX_PAGE_SIZE}`,
    );
  }
  return limit;
}

const TICKER_PATTERN = /^[A-Z0-9.\-^]{1,12}$/;

export function parseTicker(value: string): string {
  const ticker = value.trim().toUpperCase();
  if (!TICKER_PATTERN.test(ticker)) {
    throw new BadRequestException(
      'ticker must be 1-12 chars (letters, digits, ".", "-", "^")',
    );
  }
  return ticker;
}

export function parseDateRange(
  from?: string,
  to?: string,
): { from?: Date; to?: Date } {
  const fromDate = from ? parseIsoDate(from, 'from') : undefined;
  const toDate = to ? parseIsoDateRangeEnd(to, 'to') : undefined;
  if (fromDate && toDate && toDate < fromDate) {
    throw new BadRequestException('to must be >= from');
  }
  return { from: fromDate, to: toDate };
}

const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function parseIsoDate(value: string, field: string): Date {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new BadRequestException(`${field} must be a valid ISO date`);
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new BadRequestException(`${field} must be a valid ISO date`);
  }
  return parsed;
}

/**
 * Parses an upper-bound date used with `<=`. Date-only inputs (YYYY-MM-DD)
 * are normalized to the end of that UTC day so the range edge is inclusive
 * (e.g. `to=2026-07-31` covers the whole 31st, not just midnight).
 */
export function parseIsoDateRangeEnd(value: string, field: string): Date {
  const parsed = parseIsoDate(value, field);
  if (DATE_ONLY_PATTERN.test(value.trim())) {
    parsed.setUTCHours(23, 59, 59, 999);
  }
  return parsed;
}
