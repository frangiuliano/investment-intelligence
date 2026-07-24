import {
  BadRequestException,
  Inject,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { HoldingsService } from '../portfolio/holdings/holdings.service';
import { WatchlistService } from '../portfolio/watchlist/watchlist.service';
import { AssetSuggestUnavailableError } from './asset-suggest.errors';
import { ASSET_SUGGEST_PORT } from './asset-suggest.port';
import type { AssetSuggestPort } from './asset-suggest.port';
import {
  AssetSuggestion,
  AssetSuggestResult,
  ProviderAssetCandidate,
} from './asset-suggest.types';

export const MIN_ASSET_SUGGEST_QUERY_LENGTH = 1;
export const MAX_ASSET_SUGGEST_RESULTS = 10;
export const ASSET_SUGGEST_SOURCE = 'yahoo-finance-search';

@Injectable()
export class AssetSuggestService {
  constructor(
    @Inject(ASSET_SUGGEST_PORT)
    private readonly assetSuggestPort: AssetSuggestPort,
    private readonly holdingsService: HoldingsService,
    private readonly watchlistService: WatchlistService,
  ) {}

  async suggest(rawQuery: string | undefined): Promise<AssetSuggestResult> {
    const query = (rawQuery ?? '').trim();
    if (query.length < MIN_ASSET_SUGGEST_QUERY_LENGTH) {
      throw new BadRequestException(
        `Query q must be at least ${MIN_ASSET_SUGGEST_QUERY_LENGTH} character`,
      );
    }

    const [providerCandidates, holdingSymbols, watchlistSymbols] =
      await Promise.all([
        this.fetchProviderCandidates(query),
        this.holdingsService.listActiveSymbols(),
        this.watchlistService.listActiveSymbols(),
      ]);

    const prioritySymbols = new Set([...holdingSymbols, ...watchlistSymbols]);

    const merged = mergeCandidates(providerCandidates, prioritySymbols, query);
    const ranked = rankSuggestions(merged, query, prioritySymbols).slice(
      0,
      MAX_ASSET_SUGGEST_RESULTS,
    );

    return {
      items: ranked,
      source: ASSET_SUGGEST_SOURCE,
    };
  }

  private async fetchProviderCandidates(
    query: string,
  ): Promise<ProviderAssetCandidate[]> {
    try {
      return await this.assetSuggestPort.suggest(query);
    } catch (error) {
      if (error instanceof AssetSuggestUnavailableError) {
        throw new ServiceUnavailableException(
          `Asset suggest provider unavailable (${error.reason})`,
        );
      }
      throw error;
    }
  }
}

function mergeCandidates(
  providerCandidates: ProviderAssetCandidate[],
  prioritySymbols: Set<string>,
  query: string,
): AssetSuggestion[] {
  const bySymbol = new Map<string, AssetSuggestion>();

  for (const candidate of providerCandidates) {
    bySymbol.set(candidate.symbol, {
      ...candidate,
      prioritized: prioritySymbols.has(candidate.symbol),
    });
  }

  for (const symbol of prioritySymbols) {
    if (!matchesQuery(symbol, symbol, query)) {
      continue;
    }
    if (bySymbol.has(symbol)) {
      continue;
    }
    bySymbol.set(symbol, {
      symbol,
      name: symbol,
      assetType: null,
      exchange: null,
      prioritized: true,
    });
  }

  return [...bySymbol.values()];
}

function rankSuggestions(
  items: AssetSuggestion[],
  query: string,
  prioritySymbols: Set<string>,
): AssetSuggestion[] {
  const normalizedQuery = query.trim().toUpperCase();

  return [...items]
    .map((item, index) => ({ item, index }))
    .sort((a, b) => {
      const aPriority = prioritySymbols.has(a.item.symbol) ? 0 : 1;
      const bPriority = prioritySymbols.has(b.item.symbol) ? 0 : 1;
      if (aPriority !== bPriority) {
        return aPriority - bPriority;
      }

      const aSymbolPrefix = a.item.symbol.startsWith(normalizedQuery) ? 0 : 1;
      const bSymbolPrefix = b.item.symbol.startsWith(normalizedQuery) ? 0 : 1;
      if (aSymbolPrefix !== bSymbolPrefix) {
        return aSymbolPrefix - bSymbolPrefix;
      }

      return a.index - b.index;
    })
    .map(({ item }) => ({
      ...item,
      prioritized: prioritySymbols.has(item.symbol),
    }));
}

function matchesQuery(symbol: string, name: string, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) {
    return false;
  }
  return symbol.toLowerCase().includes(q) || name.toLowerCase().includes(q);
}
