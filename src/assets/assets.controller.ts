import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { DashboardApiKeyGuard } from '../common/guards/dashboard-api-key.guard';
import { AssetSuggestService } from './asset-suggest.service';

@Controller('assets')
@UseGuards(DashboardApiKeyGuard)
export class AssetsController {
  constructor(private readonly assetSuggestService: AssetSuggestService) {}

  @Get('suggest')
  async suggest(@Query('q') q?: string) {
    return this.assetSuggestService.suggest(q);
  }
}
