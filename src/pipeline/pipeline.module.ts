import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NewsAnalysis } from '../analysis/entities/news-analysis.entity';
import { AnalysisModule } from '../analysis/analysis.module';
import { NewsArticle } from '../news/entities/news-article.entity';
import { NewsModule } from '../news/news.module';
import { DigestScheduler } from '../notifications/digest.scheduler';
import { Notification } from '../notifications/entities/notification.entity';
import { NotificationsModule } from '../notifications/notifications.module';
import { RelevanceModule } from '../relevance/relevance.module';
import { PipelineScheduler } from './pipeline.scheduler';
import { PipelineService } from './pipeline.service';
import { PipelineStatusService } from './pipeline-status.service';
import { StatusController } from './status.controller';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    TypeOrmModule.forFeature([NewsArticle, NewsAnalysis, Notification]),
    NewsModule,
    AnalysisModule,
    RelevanceModule,
    NotificationsModule,
  ],
  controllers: [StatusController],
  providers: [
    PipelineService,
    PipelineScheduler,
    DigestScheduler,
    PipelineStatusService,
  ],
  exports: [PipelineService],
})
export class PipelineModule {}
