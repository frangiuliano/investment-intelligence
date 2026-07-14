import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ExecutionContext } from '@nestjs/common';
import {
  TELEGRAM_SECRET_HEADER,
  TelegramSecretGuard,
} from './telegram-secret.guard';

describe('TelegramSecretGuard', () => {
  function createContext(headerValue?: string): ExecutionContext {
    return {
      switchToHttp: () => ({
        getRequest: () => ({
          header: (name: string) =>
            name === TELEGRAM_SECRET_HEADER ? headerValue : undefined,
        }),
      }),
    } as unknown as ExecutionContext;
  }

  it('allows matching secret tokens', () => {
    const guard = new TelegramSecretGuard({
      getOrThrow: () => 'secret-token',
    } as unknown as ConfigService);

    expect(guard.canActivate(createContext('secret-token'))).toBe(true);
  });

  it('rejects missing configured secret', () => {
    const guard = new TelegramSecretGuard({
      getOrThrow: () => '',
    } as unknown as ConfigService);

    expect(() => guard.canActivate(createContext('anything'))).toThrow(
      UnauthorizedException,
    );
  });

  it('rejects mismatched tokens', () => {
    const guard = new TelegramSecretGuard({
      getOrThrow: () => 'secret-token',
    } as unknown as ConfigService);

    expect(() => guard.canActivate(createContext('wrong'))).toThrow(
      UnauthorizedException,
    );
  });
});
