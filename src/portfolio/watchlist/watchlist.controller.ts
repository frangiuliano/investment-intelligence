import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { WatchlistService } from './watchlist.service';
import type {
  CreateWatchlistEntryInput,
  UpdateWatchlistEntryInput,
} from './watchlist.service';

@Controller('watchlist')
export class WatchlistController {
  constructor(private readonly watchlistService: WatchlistService) {}

  @Get()
  async list() {
    return this.watchlistService.findAll();
  }

  @Get(':id')
  async getOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.watchlistService.findOne(id);
  }

  @Post()
  async create(@Body() body: CreateWatchlistEntryInput) {
    return this.watchlistService.create(body);
  }

  @Patch(':id')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UpdateWatchlistEntryInput,
  ) {
    return this.watchlistService.update(id, body);
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.watchlistService.softDelete(id);
  }
}
