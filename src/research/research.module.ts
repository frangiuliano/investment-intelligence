import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Hypothesis } from './hypotheses/entities/hypothesis.entity';
import { HypothesesController } from './hypotheses/hypotheses.controller';
import { HypothesesService } from './hypotheses/hypotheses.service';

@Module({
  imports: [TypeOrmModule.forFeature([Hypothesis])],
  controllers: [HypothesesController],
  providers: [HypothesesService],
  exports: [TypeOrmModule, HypothesesService],
})
export class ResearchModule {}
