import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { YahooMarketDataAdapter } from './adapters/yahoo-market-data.adapter';
import { MARKET_DATA_PORT, MarketDataPort } from './market-data.port';
import { MarketDataService } from './market-data.service';

@Module({
  providers: [
    YahooMarketDataAdapter,
    {
      provide: MARKET_DATA_PORT,
      inject: [ConfigService, YahooMarketDataAdapter],
      useFactory: (
        configService: ConfigService,
        yahooAdapter: YahooMarketDataAdapter,
      ): MarketDataPort => {
        const provider = configService.getOrThrow<string>(
          'marketData.provider',
        );
        if (provider !== 'yahoo') {
          throw new Error(`Unsupported market data provider: ${provider}`);
        }
        return yahooAdapter;
      },
    },
    MarketDataService,
  ],
  exports: [MarketDataService],
})
export class MarketDataModule {}
