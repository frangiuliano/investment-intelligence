import { ProviderAssetCandidate } from './asset-suggest.types';

export const ASSET_SUGGEST_PORT = Symbol('ASSET_SUGGEST_PORT');

export interface AssetSuggestPort {
  suggest(query: string): Promise<ProviderAssetCandidate[]>;
}
