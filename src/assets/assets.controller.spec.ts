import { AssetSuggestService } from './asset-suggest.service';
import { AssetsController } from './assets.controller';

describe('AssetsController', () => {
  const assetSuggestService = {
    suggest: jest.fn(),
  };

  const controller = new AssetsController(
    assetSuggestService as unknown as AssetSuggestService,
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('delegates suggest queries to the service', async () => {
    assetSuggestService.suggest.mockResolvedValue({
      items: [
        {
          symbol: 'AAPL',
          name: 'Apple Inc.',
          assetType: 'equity',
          exchange: 'NASDAQ',
          prioritized: false,
        },
      ],
      source: 'yahoo-finance-search',
    });

    await expect(controller.suggest('AAP')).resolves.toEqual({
      items: [
        {
          symbol: 'AAPL',
          name: 'Apple Inc.',
          assetType: 'equity',
          exchange: 'NASDAQ',
          prioritized: false,
        },
      ],
      source: 'yahoo-finance-search',
    });
    expect(assetSuggestService.suggest).toHaveBeenCalledWith('AAP');
  });
});
