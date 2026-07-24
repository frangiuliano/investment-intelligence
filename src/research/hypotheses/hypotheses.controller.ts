import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { HypothesesService } from './hypotheses.service';
import type {
  CloseHypothesisInput,
  CreateHypothesisInput,
} from './hypotheses.service';

@Controller('hypotheses')
export class HypothesesController {
  constructor(private readonly hypothesesService: HypothesesService) {}

  @Get()
  async list(
    @Query('status') status?: string,
    @Query('source') source?: string,
    @Query('sourceRefId') sourceRefId?: string,
  ) {
    return this.hypothesesService.findAll(status, source, sourceRefId);
  }

  @Post()
  async create(@Body() body: CreateHypothesisInput) {
    return this.hypothesesService.create(body);
  }

  @Patch(':id/close')
  async close(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body?: CloseHypothesisInput,
  ) {
    return this.hypothesesService.close(id, body);
  }
}
