import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DashboardApiKeyGuard } from '../common/guards/dashboard-api-key.guard';
import { PortfolioModule } from '../portfolio/portfolio.module';
import { YahooAssetSuggestAdapter } from './adapters/yahoo-asset-suggest.adapter';
import { ASSET_SUGGEST_PORT, AssetSuggestPort } from './asset-suggest.port';
import { AssetSuggestService } from './asset-suggest.service';
import { AssetsController } from './assets.controller';

@Module({
  imports: [PortfolioModule],
  controllers: [AssetsController],
  providers: [
    YahooAssetSuggestAdapter,
    {
      provide: ASSET_SUGGEST_PORT,
      inject: [ConfigService, YahooAssetSuggestAdapter],
      useFactory: (
        configService: ConfigService,
        yahooAdapter: YahooAssetSuggestAdapter,
      ): AssetSuggestPort => {
        const provider = configService.getOrThrow<string>(
          'marketData.provider',
        );
        if (provider !== 'yahoo') {
          throw new Error(`Unsupported asset suggest provider: ${provider}`);
        }
        return yahooAdapter;
      },
    },
    AssetSuggestService,
    DashboardApiKeyGuard,
  ],
  exports: [AssetSuggestService],
})
export class AssetsModule {}
