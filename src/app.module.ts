import { Module } from '@nestjs/common';
import { AppConfigModule } from './config/config.module';
import { DatabaseModule } from './database/database.module';
import { HealthModule } from './health/health.module';
import { NewsModule } from './news/news.module';
import { AnalysisModule } from './analysis/analysis.module';
import { NotificationsModule } from './notifications/notifications.module';
import { PipelineModule } from './pipeline/pipeline.module';

@Module({
  imports: [
    AppConfigModule,
    DatabaseModule,
    HealthModule,
    NewsModule,
    AnalysisModule,
    NotificationsModule,
    PipelineModule,
  ],
})
export class AppModule {}
