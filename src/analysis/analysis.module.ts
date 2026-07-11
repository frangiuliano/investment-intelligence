import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NewsAnalysis } from './entities/news-analysis.entity';

@Module({
  imports: [TypeOrmModule.forFeature([NewsAnalysis])],
  exports: [TypeOrmModule],
})
export class AnalysisModule {}
