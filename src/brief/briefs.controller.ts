import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  StreamableFile,
  UseGuards,
} from '@nestjs/common';
import { DashboardApiKeyGuard } from '../common/guards/dashboard-api-key.guard';
import { BriefService } from './brief.service';
import { BriefsQueryService } from './briefs-query.service';
import type { ListBriefsQuery } from './briefs-query.service';

type RequestBriefBody = {
  ticker?: string;
};

@Controller('briefs')
@UseGuards(DashboardApiKeyGuard)
export class BriefsController {
  constructor(
    private readonly briefsQueryService: BriefsQueryService,
    private readonly briefService: BriefService,
  ) {}

  @Get()
  async list(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('ticker') ticker?: string,
  ) {
    return this.briefsQueryService.findBriefs(
      buildListQuery(page, limit, ticker),
    );
  }

  @Get(':id/chart')
  async chart(@Param('id', ParseUUIDPipe) id: string): Promise<StreamableFile> {
    const png = await this.briefsQueryService.findBriefChartPng(id);
    return new StreamableFile(png, {
      type: 'image/png',
      disposition: `inline; filename="brief-${id}-chart.png"`,
    });
  }

  @Get(':id')
  async detail(@Param('id', ParseUUIDPipe) id: string) {
    return this.briefsQueryService.findBrief(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async request(@Body() body: RequestBriefBody = {}) {
    return this.briefService.requestBriefOrThrow(body.ticker ?? '');
  }
}

function buildListQuery(
  page?: string,
  limit?: string,
  ticker?: string,
): ListBriefsQuery {
  return {
    ticker,
    page: page !== undefined ? Number(page) : undefined,
    limit: limit !== undefined ? Number(limit) : undefined,
  };
}
