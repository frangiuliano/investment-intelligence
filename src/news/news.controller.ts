import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Query,
  UseGuards,
} from '@nestjs/common';
import { DashboardApiKeyGuard } from '../common/guards/dashboard-api-key.guard';
import { NewsQueryService } from './news-query.service';
import type { ListNewsQuery } from './news-query.service';

@Controller('news')
@UseGuards(DashboardApiKeyGuard)
export class NewsController {
  constructor(private readonly newsQueryService: NewsQueryService) {}

  @Get('articles')
  async listArticles(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('ticker') ticker?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.newsQueryService.findArticles(
      buildListQuery(page, limit, ticker, from, to),
    );
  }

  @Get('articles/:id')
  async articleDetail(@Param('id', ParseUUIDPipe) id: string) {
    return this.newsQueryService.findArticle(id);
  }

  @Get('analyses')
  async listAnalyses(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('ticker') ticker?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.newsQueryService.findAnalyses(
      buildListQuery(page, limit, ticker, from, to),
    );
  }
}

function buildListQuery(
  page?: string,
  limit?: string,
  ticker?: string,
  from?: string,
  to?: string,
): ListNewsQuery {
  return {
    ticker,
    from,
    to,
    page: page !== undefined ? Number(page) : undefined,
    limit: limit !== undefined ? Number(limit) : undefined,
  };
}
