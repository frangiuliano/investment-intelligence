import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationsModule } from '../notifications/notifications.module';
import { PortfolioModule } from '../portfolio/portfolio.module';
import { BriefGeminiClient } from './brief-gemini.client';
import { BriefService } from './brief.service';
import { ResearchBrief } from './entities/research-brief.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([ResearchBrief]),
    PortfolioModule,
    NotificationsModule,
  ],
  providers: [BriefGeminiClient, BriefService],
  exports: [TypeOrmModule, BriefService],
})
export class BriefModule {}
