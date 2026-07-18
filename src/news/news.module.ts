import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NewsAnalysis } from '../analysis/entities/news-analysis.entity';
import { DashboardApiKeyGuard } from '../common/guards/dashboard-api-key.guard';
import { NewsArticle } from './entities/news-article.entity';
import { NewsCollectorService } from './news-collector.service';
import { NewsController } from './news.controller';
import { NewsQueryService } from './news-query.service';
import { RssFeedClient } from './rss-feed.client';

@Module({
  imports: [TypeOrmModule.forFeature([NewsArticle, NewsAnalysis])],
  controllers: [NewsController],
  providers: [
    RssFeedClient,
    NewsCollectorService,
    NewsQueryService,
    DashboardApiKeyGuard,
  ],
  exports: [TypeOrmModule, NewsCollectorService],
})
export class NewsModule {}
