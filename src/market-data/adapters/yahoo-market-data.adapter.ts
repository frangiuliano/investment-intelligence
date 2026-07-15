import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MarketDataUnavailableError } from '../market-data.errors';
import { MarketDataPort } from '../market-data.port';
import {
  MarketDataTimeframe,
  MarketSeries,
  OhlcvBar,
} from '../market-data.types';

const YAHOO_CHART_BASE_URL =
  'https://query1.finance.yahoo.com/v8/finance/chart';
const YAHOO_SOURCE = 'yahoo-finance-chart';

type YahooQuote = {
  open?: Array<number | null>;
  high?: Array<number | null>;
  low?: Array<number | null>;
  close?: Array<number | null>;
  volume?: Array<number | null>;
};

type YahooChartResponse = {
  chart?: {
    result?: Array<{
      meta?: { symbol?: string };
      timestamp?: Array<number | null>;
      indicators?: {
        quote?: YahooQuote[];
      };
    }> | null;
    error?: { code?: string; description?: string } | null;
  };
};

@Injectable()
export class YahooMarketDataAdapter implements MarketDataPort {
  constructor(private readonly configService: ConfigService) {}

  async getSeries(
    symbol: string,
    timeframe: MarketDataTimeframe,
  ): Promise<MarketSeries> {
    const timeoutMs = this.configService.getOrThrow<number>(
      'marketData.timeoutMs',
    );
    const url = new URL(
      `${YAHOO_CHART_BASE_URL}/${encodeURIComponent(symbol)}`,
    );
    url.searchParams.set('interval', timeframe);
    url.searchParams.set('range', '6mo');
    url.searchParams.set('events', 'history');

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        method: 'GET',
        signal: controller.signal,
        headers: {
          Accept: 'application/json',
          'User-Agent': 'investment-intelligence-market-data/0.1',
        },
      });

      if (!response.ok) {
        throw new MarketDataUnavailableError(
          symbol,
          response.status === 404 ? 'not_found' : 'provider_error',
          `Yahoo market data request failed with HTTP ${response.status}`,
          response.status,
        );
      }

      return this.parseResponse(
        symbol,
        timeframe,
        await readJsonWithAbort<YahooChartResponse>(
          response,
          controller.signal,
        ),
      );
    } catch (error) {
      if (error instanceof MarketDataUnavailableError) {
        throw error;
      }
      if (isAbortError(error)) {
        throw new MarketDataUnavailableError(
          symbol,
          'timeout',
          `Yahoo market data request timed out after ${timeoutMs}ms`,
        );
      }
      throw new MarketDataUnavailableError(
        symbol,
        'provider_error',
        `Yahoo market data request failed: ${errorMessage(error)}`,
      );
    } finally {
      clearTimeout(timeout);
    }
  }

  private parseResponse(
    requestedSymbol: string,
    timeframe: MarketDataTimeframe,
    payload: YahooChartResponse,
  ): MarketSeries {
    const providerError = payload.chart?.error;
    if (providerError) {
      throw new MarketDataUnavailableError(
        requestedSymbol,
        providerError.code === 'Not Found' ? 'not_found' : 'provider_error',
        providerError.description ?? 'Yahoo returned an unknown error',
      );
    }

    const result = payload.chart?.result?.[0];
    const quote = result?.indicators?.quote?.[0];
    if (!result || !quote || !result.timestamp) {
      throw invalidResponse(requestedSymbol, 'missing chart data');
    }

    const bars = result.timestamp.flatMap((timestamp, index) => {
      const bar = toOhlcvBar(timestamp, quote, index);
      return bar ? [bar] : [];
    });

    if (bars.length === 0) {
      throw invalidResponse(requestedSymbol, 'no complete OHLCV bars');
    }

    return {
      symbol: (result.meta?.symbol ?? requestedSymbol).toUpperCase(),
      timeframe,
      bars,
      asOf: new Date().toISOString(),
      source: YAHOO_SOURCE,
    };
  }
}

function toOhlcvBar(
  timestamp: number | null,
  quote: YahooQuote,
  index: number,
): OhlcvBar | null {
  const values = [
    quote.open?.[index],
    quote.high?.[index],
    quote.low?.[index],
    quote.close?.[index],
    quote.volume?.[index],
  ];
  if (
    timestamp === null ||
    !Number.isFinite(timestamp) ||
    values.some((value) => value === null || !Number.isFinite(value))
  ) {
    return null;
  }

  const [open, high, low, close, volume] = values as number[];
  if (
    open < 0 ||
    high < Math.max(open, close) ||
    low < 0 ||
    low > Math.min(open, close) ||
    close < 0 ||
    volume < 0
  ) {
    return null;
  }

  return {
    time: new Date(timestamp * 1000).toISOString().slice(0, 10),
    open,
    high,
    low,
    close,
    volume,
  };
}

function invalidResponse(
  symbol: string,
  detail: string,
): MarketDataUnavailableError {
  return new MarketDataUnavailableError(
    symbol,
    'invalid_response',
    `Yahoo returned invalid market data: ${detail}`,
  );
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
  const error = new Error('Market data response aborted');
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
