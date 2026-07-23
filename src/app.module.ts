import { Module } from '@nestjs/common';
import { AppConfigModule } from './config/config.module';
import { DatabaseModule } from './database/database.module';
import { HealthModule } from './health/health.module';
import { NewsModule } from './news/news.module';
import { AnalysisModule } from './analysis/analysis.module';
import { BriefModule } from './brief/brief.module';
import { FeedbackModule } from './feedback/feedback.module';
import { MarketDataModule } from './market-data/market-data.module';
import { NotificationsModule } from './notifications/notifications.module';
import { PipelineModule } from './pipeline/pipeline.module';
import { PortfolioModule } from './portfolio/portfolio.module';
import { RelevanceModule } from './relevance/relevance.module';
import { ResearchModule } from './research/research.module';
import { TelegramBotModule } from './telegram-bot/telegram-bot.module';

@Module({
  imports: [
    AppConfigModule,
    DatabaseModule,
    HealthModule,
    NewsModule,
    AnalysisModule,
    RelevanceModule,
    NotificationsModule,
    PipelineModule,
    PortfolioModule,
    BriefModule,
    FeedbackModule,
    MarketDataModule,
    ResearchModule,
    TelegramBotModule,
  ],
})
export class AppModule {}
