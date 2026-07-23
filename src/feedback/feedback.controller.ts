import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import { DashboardApiKeyGuard } from '../common/guards/dashboard-api-key.guard';
import { FeedbackService } from './feedback.service';
import type { CreateFeedbackInput } from './feedback.types';

@Controller('feedback')
@UseGuards(DashboardApiKeyGuard)
export class FeedbackController {
  constructor(private readonly feedbackService: FeedbackService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() body: CreateFeedbackInput) {
    return this.feedbackService.create(body);
  }
}
