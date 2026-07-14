import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Holding } from './holdings/entities/holding.entity';
import { HoldingsController } from './holdings/holdings.controller';
import { HoldingsService } from './holdings/holdings.service';
import { WatchlistEntry } from './watchlist/entities/watchlist-entry.entity';
import { WatchlistController } from './watchlist/watchlist.controller';
import { WatchlistService } from './watchlist/watchlist.service';

@Module({
  imports: [TypeOrmModule.forFeature([Holding, WatchlistEntry])],
  controllers: [HoldingsController, WatchlistController],
  providers: [HoldingsService, WatchlistService],
  exports: [TypeOrmModule, HoldingsService, WatchlistService],
})
export class PortfolioModule {}
