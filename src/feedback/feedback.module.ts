import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NewsAnalysis } from '../analysis/entities/news-analysis.entity';
import { ResearchBrief } from '../brief/entities/research-brief.entity';
import { DashboardApiKeyGuard } from '../common/guards/dashboard-api-key.guard';
import { Notification } from '../notifications/entities/notification.entity';
import { OperatorFeedback } from './entities/operator-feedback.entity';
import { FeedbackController } from './feedback.controller';
import { FeedbackService } from './feedback.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      OperatorFeedback,
      NewsAnalysis,
      ResearchBrief,
      Notification,
    ]),
  ],
  controllers: [FeedbackController],
  providers: [FeedbackService, DashboardApiKeyGuard],
  exports: [TypeOrmModule, FeedbackService],
})
export class FeedbackModule {}
