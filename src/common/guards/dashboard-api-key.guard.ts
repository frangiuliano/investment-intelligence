import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';

export const DASHBOARD_API_KEY_HEADER = 'x-dashboard-api-key';

@Injectable()
export class DashboardApiKeyGuard implements CanActivate {
  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const expected = this.configService
      .getOrThrow<string>('dashboard.apiKey')
      .trim();

    if (!expected) {
      throw new UnauthorizedException(
        'Dashboard API is disabled (DASHBOARD_API_KEY is empty)',
      );
    }

    const request = context.switchToHttp().getRequest<Request>();
    const provided = request.header(DASHBOARD_API_KEY_HEADER) ?? '';

    if (provided !== expected) {
      throw new UnauthorizedException('Invalid dashboard API key');
    }

    return true;
  }
}
