import { Module } from '@nestjs/common';
import { BriefModule } from '../brief/brief.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { CommandRouterService } from './command-router.service';
import { TelegramSecretGuard } from './guards/telegram-secret.guard';
import { TelegramUpdateController } from './telegram-update.controller';
import { UpdateDedupeService } from './update-dedupe.service';

@Module({
  imports: [BriefModule, NotificationsModule],
  controllers: [TelegramUpdateController],
  providers: [CommandRouterService, TelegramSecretGuard, UpdateDedupeService],
})
export class TelegramBotModule {}
