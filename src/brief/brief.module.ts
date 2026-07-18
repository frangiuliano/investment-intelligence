import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChartsModule } from '../charts/charts.module';
import { DashboardApiKeyGuard } from '../common/guards/dashboard-api-key.guard';
import { MarketDataModule } from '../market-data/market-data.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { PortfolioModule } from '../portfolio/portfolio.module';
import { BriefGeminiClient } from './brief-gemini.client';
import { BriefService } from './brief.service';
import { BriefsController } from './briefs.controller';
import { BriefsQueryService } from './briefs-query.service';
import { ResearchBrief } from './entities/research-brief.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([ResearchBrief]),
    ChartsModule,
    PortfolioModule,
    MarketDataModule,
    NotificationsModule,
  ],
  controllers: [BriefsController],
  providers: [
    BriefGeminiClient,
    BriefService,
    BriefsQueryService,
    DashboardApiKeyGuard,
  ],
  exports: [TypeOrmModule, BriefService],
})
export class BriefModule {}
