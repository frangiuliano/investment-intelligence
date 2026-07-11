import {
  assertSafeTestDatabaseUrl,
  resolveTestDatabaseUrl,
} from './test-database-url';

describe('resolveTestDatabaseUrl', () => {
  const previousDatabaseUrl = process.env.DATABASE_URL;

  afterEach(() => {
    if (previousDatabaseUrl === undefined) {
      delete process.env.DATABASE_URL;
    } else {
      process.env.DATABASE_URL = previousDatabaseUrl;
    }
  });

  it('should default to investment_intelligence_test and never use DATABASE_URL', () => {
    process.env.DATABASE_URL =
      'postgresql://postgres:postgres@localhost:5432/investment_intelligence';

    expect(resolveTestDatabaseUrl(undefined)).toBe(
      'postgresql://postgres:postgres@localhost:5432/investment_intelligence_test',
    );
  });

  it('should accept an explicit TEST_DATABASE_URL ending in _test', () => {
    expect(
      resolveTestDatabaseUrl(
        'postgresql://postgres:postgres@localhost:5432/my_app_test',
      ),
    ).toBe('postgresql://postgres:postgres@localhost:5432/my_app_test');
  });

  it('should reject a non-test database name', () => {
    expect(() =>
      assertSafeTestDatabaseUrl(
        'postgresql://postgres:postgres@localhost:5432/investment_intelligence',
      ),
    ).toThrow(/non-test database/);
  });
});
