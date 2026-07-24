import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AssetSuggestUnavailableError } from '../asset-suggest.errors';
import { AssetSuggestPort } from '../asset-suggest.port';
import { ProviderAssetCandidate } from '../asset-suggest.types';

const YAHOO_SEARCH_URL = 'https://query1.finance.yahoo.com/v1/finance/search';
const QUOTES_COUNT = 12;
const ALLOWED_QUOTE_TYPES = new Set(['EQUITY', 'ETF']);

type YahooSearchQuote = {
  symbol?: string;
  shortname?: string;
  longname?: string;
  quoteType?: string;
  exchange?: string;
  exchDisp?: string;
};

type YahooSearchResponse = {
  quotes?: YahooSearchQuote[] | null;
};

@Injectable()
export class YahooAssetSuggestAdapter implements AssetSuggestPort {
  constructor(private readonly configService: ConfigService) {}

  async suggest(query: string): Promise<ProviderAssetCandidate[]> {
    const timeoutMs = this.configService.getOrThrow<number>(
      'marketData.timeoutMs',
    );
    const url = new URL(YAHOO_SEARCH_URL);
    url.searchParams.set('q', query);
    url.searchParams.set('quotesCount', String(QUOTES_COUNT));
    url.searchParams.set('newsCount', '0');

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        method: 'GET',
        signal: controller.signal,
        headers: {
          Accept: 'application/json',
          'User-Agent': 'investment-intelligence-asset-suggest/0.1',
        },
      });

      if (!response.ok) {
        throw new AssetSuggestUnavailableError(
          'provider_error',
          `Yahoo asset suggest request failed with HTTP ${response.status}`,
          response.status,
        );
      }

      const payload = await readJsonWithAbort<YahooSearchResponse>(
        response,
        controller.signal,
      );
      return parseQuotes(payload);
    } catch (error) {
      if (error instanceof AssetSuggestUnavailableError) {
        throw error;
      }
      if (isAbortError(error)) {
        throw new AssetSuggestUnavailableError(
          'timeout',
          `Yahoo asset suggest request timed out after ${timeoutMs}ms`,
        );
      }
      throw new AssetSuggestUnavailableError(
        'provider_error',
        `Yahoo asset suggest request failed: ${errorMessage(error)}`,
      );
    } finally {
      clearTimeout(timeout);
    }
  }
}

function parseQuotes(payload: YahooSearchResponse): ProviderAssetCandidate[] {
  const quotes = payload.quotes;
  if (!Array.isArray(quotes)) {
    throw new AssetSuggestUnavailableError(
      'invalid_response',
      'Yahoo returned invalid asset suggest payload',
    );
  }

  const seen = new Set<string>();
  const items: ProviderAssetCandidate[] = [];

  for (const quote of quotes) {
    const symbol = quote.symbol?.trim().toUpperCase();
    const quoteType = quote.quoteType?.trim().toUpperCase();
    if (!symbol || !quoteType || !ALLOWED_QUOTE_TYPES.has(quoteType)) {
      continue;
    }
    if (seen.has(symbol)) {
      continue;
    }
    seen.add(symbol);

    const name = quote.longname?.trim() || quote.shortname?.trim() || symbol;
    items.push({
      symbol,
      name,
      assetType: quoteType.toLowerCase(),
      exchange: quote.exchDisp?.trim() || quote.exchange?.trim() || null,
    });
  }

  return items;
}

function readJsonWithAbort<T>(
  response: Response,
  signal: AbortSignal,
): Promise<T> {
  if (signal.aborted) {
    return Promise.reject(createAbortError());
  }

  return new Promise<T>((resolve, reject) => {
    const onAbort = () => reject(createAbortError());
    signal.addEventListener('abort', onAbort, { once: true });
    (response.json() as Promise<T>).then(
      (value) => {
        signal.removeEventListener('abort', onAbort);
        resolve(value);
      },
      (error: unknown) => {
        signal.removeEventListener('abort', onAbort);
        reject(error instanceof Error ? error : new Error(String(error)));
      },
    );
  });
}

function createAbortError(): Error {
  const error = new Error('Asset suggest response aborted');
  error.name = 'AbortError';
  return error;
}

function isAbortError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'name' in error &&
    (error as { name: string }).name === 'AbortError'
  );
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
