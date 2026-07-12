import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NewsAnalysis } from '../analysis/entities/news-analysis.entity';
import { RelevanceModule } from '../relevance/relevance.module';
import { Notification } from './entities/notification.entity';
import { NotificationsService } from './notifications.service';
import { TelegramClient } from './telegram.client';

@Module({
  imports: [
    TypeOrmModule.forFeature([Notification, NewsAnalysis]),
    RelevanceModule,
  ],
  providers: [TelegramClient, NotificationsService],
  exports: [TypeOrmModule, NotificationsService],
})
export class NotificationsModule {}
