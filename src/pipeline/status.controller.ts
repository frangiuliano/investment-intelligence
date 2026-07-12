import { Controller, Get } from '@nestjs/common';
import { PipelineStatusService } from './pipeline-status.service';

@Controller('status')
export class StatusController {
  constructor(private readonly pipelineStatusService: PipelineStatusService) {}

  @Get()
  async getStatus() {
    return this.pipelineStatusService.getStatus();
  }
}
