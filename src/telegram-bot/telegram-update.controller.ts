import {
  Body,
  Controller,
  HttpCode,
  Logger,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CommandRouterService } from './command-router.service';
import { TelegramSecretGuard } from './guards/telegram-secret.guard';
import type { TelegramUpdate } from './telegram-command';
import { UpdateDedupeService } from './update-dedupe.service';

@Controller('telegram')
export class TelegramUpdateController {
  private readonly logger = new Logger(TelegramUpdateController.name);

  constructor(
    private readonly commandRouter: CommandRouterService,
    private readonly updateDedupe: UpdateDedupeService,
  ) {}

  @Post('webhook')
  @HttpCode(200)
  @UseGuards(TelegramSecretGuard)
  webhook(@Body() update: TelegramUpdate): { ok: true } {
    const payload = update ?? {};
    const updateId = payload.update_id;

    if (!this.updateDedupe.claim(updateId)) {
      this.logger.debug(
        `Skipping duplicate Telegram update_id=${String(updateId)}`,
      );
      return { ok: true };
    }

    void this.commandRouter
      .handleUpdate(payload)
      .catch((error: unknown) => {
        const detail = error instanceof Error ? error.message : String(error);
        this.logger.error(`Telegram webhook handler failed: ${detail}`);
      })
      .finally(() => {
        this.updateDedupe.complete(updateId);
      });

    return { ok: true };
  }
}
