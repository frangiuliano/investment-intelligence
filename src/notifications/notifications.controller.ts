import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Query,
  UseGuards,
} from '@nestjs/common';
import { DashboardApiKeyGuard } from '../common/guards/dashboard-api-key.guard';
import { NotificationsQueryService } from './notifications-query.service';
import type { ListNotificationsQuery } from './notifications-query.service';

@Controller('notifications')
@UseGuards(DashboardApiKeyGuard)
export class NotificationsController {
  constructor(
    private readonly notificationsQueryService: NotificationsQueryService,
  ) {}

  @Get()
  async listNotifications(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('ticker') ticker?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.notificationsQueryService.findNotifications(
      buildListQuery(page, limit, ticker, from, to),
    );
  }

  @Get(':id')
  async notificationDetail(@Param('id', ParseUUIDPipe) id: string) {
    return this.notificationsQueryService.findNotification(id);
  }
}

function buildListQuery(
  page?: string,
  limit?: string,
  ticker?: string,
  from?: string,
  to?: string,
): ListNotificationsQuery {
  return {
    ticker,
    from,
    to,
    page: page !== undefined ? Number(page) : undefined,
    limit: limit !== undefined ? Number(limit) : undefined,
  };
}
