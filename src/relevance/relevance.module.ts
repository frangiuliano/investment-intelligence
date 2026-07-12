import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NewsAnalysis } from '../analysis/entities/news-analysis.entity';
import { Notification } from '../notifications/entities/notification.entity';
import { RelevanceService } from './relevance.service';

@Module({
  imports: [TypeOrmModule.forFeature([NewsAnalysis, Notification])],
  providers: [RelevanceService],
  exports: [RelevanceService],
})
export class RelevanceModule {}
