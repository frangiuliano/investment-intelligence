import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChartsModule } from '../charts/charts.module';
import { MarketDataModule } from '../market-data/market-data.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { PortfolioModule } from '../portfolio/portfolio.module';
import { BriefGeminiClient } from './brief-gemini.client';
import { BriefService } from './brief.service';
import { ResearchBrief } from './entities/research-brief.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([ResearchBrief]),
    ChartsModule,
    PortfolioModule,
    MarketDataModule,
    NotificationsModule,
  ],
  providers: [BriefGeminiClient, BriefService],
  exports: [TypeOrmModule, BriefService],
})
export class BriefModule {}
