import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NewsArticle } from './entities/news-article.entity';
import { NewsCollectorScheduler } from './news-collector.scheduler';
import { NewsCollectorService } from './news-collector.service';
import { RssFeedClient } from './rss-feed.client';

@Module({
  imports: [ScheduleModule.forRoot(), TypeOrmModule.forFeature([NewsArticle])],
  providers: [RssFeedClient, NewsCollectorService, NewsCollectorScheduler],
  exports: [TypeOrmModule, NewsCollectorService],
})
export class NewsModule {}
