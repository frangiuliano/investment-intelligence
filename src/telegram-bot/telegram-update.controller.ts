import { Body, Controller, HttpCode, Post, UseGuards } from '@nestjs/common';
import { CommandRouterService } from './command-router.service';
import { TelegramSecretGuard } from './guards/telegram-secret.guard';
import type { TelegramUpdate } from './telegram-command';

@Controller('telegram')
export class TelegramUpdateController {
  constructor(private readonly commandRouter: CommandRouterService) {}

  @Post('webhook')
  @HttpCode(200)
  @UseGuards(TelegramSecretGuard)
  async webhook(@Body() update: TelegramUpdate): Promise<{ ok: true }> {
    await this.commandRouter.handleUpdate(update ?? {});
    return { ok: true };
  }
}
