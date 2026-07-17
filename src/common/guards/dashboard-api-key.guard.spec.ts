import { ConfigService } from '@nestjs/config';
import { UnauthorizedException } from '@nestjs/common';
import { DashboardApiKeyGuard } from './dashboard-api-key.guard';

describe('DashboardApiKeyGuard', () => {
  function createGuard(apiKey: string) {
    return new DashboardApiKeyGuard({
      getOrThrow: (key: string) => {
        if (key === 'dashboard.apiKey') {
          return apiKey;
        }
        throw new Error(key);
      },
    } as unknown as ConfigService);
  }

  function contextWithHeader(value: string | undefined) {
    return {
      switchToHttp: () => ({
        getRequest: () => ({
          header: (name: string) =>
            name.toLowerCase() === 'x-dashboard-api-key' ? value : undefined,
        }),
      }),
    };
  }

  it('rejects when DASHBOARD_API_KEY is empty', () => {
    const guard = createGuard('');
    expect(() =>
      guard.canActivate(contextWithHeader('anything') as never),
    ).toThrow(UnauthorizedException);
  });

  it('rejects an invalid key', () => {
    const guard = createGuard('secret');
    expect(() =>
      guard.canActivate(contextWithHeader('wrong') as never),
    ).toThrow(UnauthorizedException);
  });

  it('allows a matching key', () => {
    const guard = createGuard('secret');
    expect(guard.canActivate(contextWithHeader('secret') as never)).toBe(true);
  });
});
