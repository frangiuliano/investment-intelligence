import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LlmModule } from '../llm/llm.module';
import { NewsArticle } from '../news/entities/news-article.entity';
import { NewsAnalysis } from './entities/news-analysis.entity';
import { GeminiClient } from './gemini.client';
import { NewsAnalysisService } from './news-analysis.service';

@Module({
  imports: [TypeOrmModule.forFeature([NewsAnalysis, NewsArticle]), LlmModule],
  providers: [GeminiClient, NewsAnalysisService],
  exports: [TypeOrmModule, NewsAnalysisService],
})
export class AnalysisModule {}
