import { Module } from '@nestjs/common';
import { KnowledgePackService } from './knowledge-pack.service';

@Module({
  providers: [KnowledgePackService],
  exports: [KnowledgePackService],
})
export class KnowledgeModule {}
