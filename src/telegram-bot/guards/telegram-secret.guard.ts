import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';

export const TELEGRAM_SECRET_HEADER = 'x-telegram-bot-api-secret-token';

@Injectable()
export class TelegramSecretGuard implements CanActivate {
  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const expected = this.configService
      .getOrThrow<string>('telegram.webhookSecret')
      .trim();

    if (!expected) {
      throw new UnauthorizedException(
        'Telegram webhook is disabled (TELEGRAM_WEBHOOK_SECRET is empty)',
      );
    }

    const request = context.switchToHttp().getRequest<Request>();
    const provided = request.header(TELEGRAM_SECRET_HEADER) ?? '';

    if (provided !== expected) {
      throw new UnauthorizedException('Invalid Telegram webhook secret');
    }

    return true;
  }
}
