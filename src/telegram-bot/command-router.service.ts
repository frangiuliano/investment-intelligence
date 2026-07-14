import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppLocale } from '../config/env.validation';
import { BriefService } from '../brief/brief.service';
import {
  formatBriefHelpMessage,
  formatBriefUsageMessage,
} from '../brief/brief-message';
import { TelegramClient } from '../notifications/telegram.client';
import { parseTelegramCommand, TelegramUpdate } from './telegram-command';

@Injectable()
export class CommandRouterService {
  private readonly logger = new Logger(CommandRouterService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly briefService: BriefService,
    private readonly telegramClient: TelegramClient,
  ) {}

  async handleUpdate(update: TelegramUpdate): Promise<void> {
    const message = update.message;
    if (!message?.text) {
      return;
    }

    const allowedChatId =
      this.configService.getOrThrow<string>('telegram.chatId');
    const chatId = String(message.chat.id);
    if (chatId !== allowedChatId) {
      this.logger.warn(
        `Ignoring Telegram update from unauthorized chat ${chatId}`,
      );
      return;
    }

    const locale = this.configService.getOrThrow<AppLocale>('locale');
    const command = parseTelegramCommand(message.text);

    switch (command.type) {
      case 'help':
        await this.telegramClient.sendMessage(formatBriefHelpMessage(locale));
        return;
      case 'brief':
        if (!command.symbol) {
          await this.telegramClient.sendMessage(
            formatBriefUsageMessage(locale),
          );
          return;
        }
        await this.briefService.requestBrief(command.symbol);
        return;
      case 'unknown':
        await this.telegramClient.sendMessage(formatBriefHelpMessage(locale));
        return;
      case 'empty':
        return;
    }
  }
}
