import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DashboardApiKeyGuard } from '../common/guards/dashboard-api-key.guard';
import { MarketDataModule } from '../market-data/market-data.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { Hypothesis } from './hypotheses/entities/hypothesis.entity';
import { HypothesesController } from './hypotheses/hypotheses.controller';
import { HypothesesService } from './hypotheses/hypotheses.service';
import { HypothesisReviewRun } from './reviews/entities/hypothesis-review-run.entity';
import { HypothesisReview } from './reviews/entities/hypothesis-review.entity';
import { ReviewsController } from './reviews/reviews.controller';
import { ReviewsService } from './reviews/reviews.service';
import { ReviewScheduler } from './reviews/reviews.scheduler';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Hypothesis,
      HypothesisReview,
      HypothesisReviewRun,
    ]),
    MarketDataModule,
    NotificationsModule,
  ],
  controllers: [HypothesesController, ReviewsController],
  providers: [
    HypothesesService,
    ReviewsService,
    ReviewScheduler,
    DashboardApiKeyGuard,
  ],
  exports: [TypeOrmModule, HypothesesService, ReviewsService],
})
export class ResearchModule {}
