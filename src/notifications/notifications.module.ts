import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NewsAnalysis } from '../analysis/entities/news-analysis.entity';
import { DashboardApiKeyGuard } from '../common/guards/dashboard-api-key.guard';
import { RelevanceModule } from '../relevance/relevance.module';
import { DigestService } from './digest.service';
import { DigestItem } from './entities/digest-item.entity';
import { DigestRun } from './entities/digest-run.entity';
import { NewsStoryClusterMember } from './entities/news-story-cluster-member.entity';
import { NewsStoryCluster } from './entities/news-story-cluster.entity';
import { Notification } from './entities/notification.entity';
import { NotificationsController } from './notifications.controller';
import { NotificationsQueryService } from './notifications-query.service';
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
  controllers: [NotificationsController],
  providers: [
    TelegramClient,
    StoryClusterService,
    NotificationsService,
    NotificationsQueryService,
    DigestService,
    DashboardApiKeyGuard,
  ],
  exports: [TypeOrmModule, TelegramClient, NotificationsService, DigestService],
})
export class NotificationsModule {}
