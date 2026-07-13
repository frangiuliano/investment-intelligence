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
import { HoldingsService } from './holdings.service';
import type {
  CreateHoldingInput,
  UpdateHoldingInput,
} from './holdings.service';

@Controller('holdings')
export class HoldingsController {
  constructor(private readonly holdingsService: HoldingsService) {}

  @Get()
  async list() {
    return this.holdingsService.findAll();
  }

  @Get(':id')
  async getOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.holdingsService.findOne(id);
  }

  @Post()
  async create(@Body() body: CreateHoldingInput) {
    return this.holdingsService.create(body);
  }

  @Patch(':id')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UpdateHoldingInput,
  ) {
    return this.holdingsService.update(id, body);
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.holdingsService.softDelete(id);
  }
}
