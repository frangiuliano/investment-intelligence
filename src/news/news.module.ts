import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NewsArticle } from './entities/news-article.entity';

@Module({
  imports: [TypeOrmModule.forFeature([NewsArticle])],
  exports: [TypeOrmModule],
})
export class NewsModule {}
