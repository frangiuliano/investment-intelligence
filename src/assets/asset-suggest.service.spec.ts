import {
  BadRequestException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { HoldingsService } from '../portfolio/holdings/holdings.service';
import { WatchlistService } from '../portfolio/watchlist/watchlist.service';
import { AssetSuggestUnavailableError } from './asset-suggest.errors';
import type { AssetSuggestPort } from './asset-suggest.port';
import { AssetSuggestService } from './asset-suggest.service';

describe('AssetSuggestService', () => {
  const suggest = jest.fn();
  const assetSuggestPort: AssetSuggestPort = {
    suggest,
  };

  const holdingsService = {
    listActiveSymbols: jest.fn(),
  };

  const watchlistService = {
    listActiveSymbols: jest.fn(),
  };

  const service = new AssetSuggestService(
    assetSuggestPort,
    holdingsService as unknown as HoldingsService,
    watchlistService as unknown as WatchlistService,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    holdingsService.listActiveSymbols.mockResolvedValue([]);
    watchlistService.listActiveSymbols.mockResolvedValue([]);
  });

  it('rejects an empty query with 400', async () => {
    await expect(service.suggest('  ')).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(suggest).not.toHaveBeenCalled();
  });

  it('returns Apple when querying AAP from the provider', async () => {
    suggest.mockResolvedValue([
      {
        symbol: 'AAP',
        name: 'Advance Auto Parts, Inc.',
        assetType: 'equity',
        exchange: 'NYSE',
      },
      {
        symbol: 'AAPL',
        name: 'Apple Inc.',
        assetType: 'equity',
        exchange: 'NASDAQ',
      },
    ]);

    await expect(service.suggest('AAP')).resolves.toEqual({
      source: 'yahoo-finance-search',
      items: [
        {
          symbol: 'AAP',
          name: 'Advance Auto Parts, Inc.',
          assetType: 'equity',
          exchange: 'NYSE',
          prioritized: false,
        },
        {
          symbol: 'AAPL',
          name: 'Apple Inc.',
          assetType: 'equity',
          exchange: 'NASDAQ',
          prioritized: false,
        },
      ],
    });
  });

  it('returns Apple when querying by company name', async () => {
    suggest.mockResolvedValue([
      {
        symbol: 'AAPL',
        name: 'Apple Inc.',
        assetType: 'equity',
        exchange: 'NASDAQ',
      },
      {
        symbol: 'APLE',
        name: 'Apple Hospitality REIT, Inc.',
        assetType: 'equity',
        exchange: 'NYSE',
      },
    ]);

    const result = await service.suggest('Apple');
    expect(result.items.map((item) => item.symbol)).toContain('AAPL');
    expect(result.source).toBe('yahoo-finance-search');
  });

  it('prioritizes holdings and watchlist matches without inventing symbols', async () => {
    holdingsService.listActiveSymbols.mockResolvedValue(['MSFT']);
    watchlistService.listActiveSymbols.mockResolvedValue(['AAPL']);
    suggest.mockResolvedValue([
      {
        symbol: 'AAP',
        name: 'Advance Auto Parts, Inc.',
        assetType: 'equity',
        exchange: 'NYSE',
      },
      {
        symbol: 'AAPL',
        name: 'Apple Inc.',
        assetType: 'equity',
        exchange: 'NASDAQ',
      },
      {
        symbol: 'MSFT',
        name: 'Microsoft Corporation',
        assetType: 'equity',
        exchange: 'NASDAQ',
      },
    ]);

    const result = await service.suggest('A');
    expect(result.items.slice(0, 2).map((item) => item.symbol)).toEqual([
      'AAPL',
      'MSFT',
    ]);
    expect(
      result.items.find((item) => item.symbol === 'AAPL')?.prioritized,
    ).toBe(true);
    expect(
      result.items.find((item) => item.symbol === 'AAP')?.prioritized,
    ).toBe(false);
  });

  it('includes a portfolio symbol that matches the query even if the provider omits it', async () => {
    holdingsService.listActiveSymbols.mockResolvedValue(['ZZTOP']);
    suggest.mockResolvedValue([
      {
        symbol: 'AAPL',
        name: 'Apple Inc.',
        assetType: 'equity',
        exchange: 'NASDAQ',
      },
    ]);

    const result = await service.suggest('ZZ');
    expect(result.items[0]).toEqual({
      symbol: 'ZZTOP',
      name: 'ZZTOP',
      assetType: null,
      exchange: null,
      prioritized: true,
    });
  });

  it('maps provider failures to 503 without inventing symbols', async () => {
    suggest.mockRejectedValue(
      new AssetSuggestUnavailableError('provider_error', 'down'),
    );

    await expect(service.suggest('AAPL')).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });

  it('returns an empty list when the provider has no matches', async () => {
    suggest.mockResolvedValue([]);

    await expect(service.suggest('ZZZZNOPE')).resolves.toEqual({
      items: [],
      source: 'yahoo-finance-search',
    });
  });
});
