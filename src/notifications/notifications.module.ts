import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NewsAnalysis } from '../analysis/entities/news-analysis.entity';
import { RelevanceModule } from '../relevance/relevance.module';
import { NewsStoryClusterMember } from './entities/news-story-cluster-member.entity';
import { NewsStoryCluster } from './entities/news-story-cluster.entity';
import { Notification } from './entities/notification.entity';
import { NotificationsService } from './notifications.service';
import { StoryClusterService } from './story-cluster.service';
import { TelegramClient } from './telegram.client';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Notification,
      NewsAnalysis,
      NewsStoryCluster,
      NewsStoryClusterMember,
    ]),
    RelevanceModule,
  ],
  providers: [TelegramClient, StoryClusterService, NotificationsService],
  exports: [TypeOrmModule, NotificationsService],
})
export class NotificationsModule {}
