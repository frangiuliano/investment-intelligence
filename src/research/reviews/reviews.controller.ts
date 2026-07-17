import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { DashboardApiKeyGuard } from '../../common/guards/dashboard-api-key.guard';
import { ReviewsService } from './reviews.service';
import type { ListReviewsQuery, RunPeriodReviewInput } from './reviews.service';

@Controller('reviews')
@UseGuards(DashboardApiKeyGuard)
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Get()
  async list(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('hypothesisId') hypothesisId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    const query: ListReviewsQuery = {
      hypothesisId,
      from,
      to,
      page: page !== undefined ? Number(page) : undefined,
      limit: limit !== undefined ? Number(limit) : undefined,
    };
    return this.reviewsService.findAll(query);
  }

  @Post('run')
  async run(@Body() body?: RunPeriodReviewInput) {
    return this.reviewsService.runPeriodReview(body ?? {});
  }

  @Get(':id')
  async detail(@Param('id', ParseUUIDPipe) id: string) {
    return this.reviewsService.findOne(id);
  }
}
