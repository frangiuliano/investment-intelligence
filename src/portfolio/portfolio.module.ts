import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Holding } from './holdings/entities/holding.entity';
import { HoldingsController } from './holdings/holdings.controller';
import { HoldingsService } from './holdings/holdings.service';

@Module({
  imports: [TypeOrmModule.forFeature([Holding])],
  controllers: [HoldingsController],
  providers: [HoldingsService],
  exports: [TypeOrmModule, HoldingsService],
})
export class PortfolioModule {}
