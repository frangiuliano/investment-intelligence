import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NewsArticle } from './entities/news-article.entity';
import { NewsCollectorService } from './news-collector.service';
import { RssFeedClient } from './rss-feed.client';

@Module({
  imports: [TypeOrmModule.forFeature([NewsArticle])],
  providers: [RssFeedClient, NewsCollectorService],
  exports: [TypeOrmModule, NewsCollectorService],
})
export class NewsModule {}
