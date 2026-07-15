import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NewsAnalysis } from '../analysis/entities/news-analysis.entity';
import { RelevanceModule } from '../relevance/relevance.module';
import { DigestService } from './digest.service';
import { DigestItem } from './entities/digest-item.entity';
import { DigestRun } from './entities/digest-run.entity';
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
      DigestRun,
      DigestItem,
    ]),
    RelevanceModule,
  ],
  providers: [
    TelegramClient,
    StoryClusterService,
    NotificationsService,
    DigestService,
  ],
  exports: [TypeOrmModule, TelegramClient, NotificationsService, DigestService],
})
export class NotificationsModule {}
