export const DEFAULT_TEST_DATABASE_URL =
  'postgresql://postgres:postgres@localhost:5432/investment_intelligence_test';

/**
 * Resolves the URL used by destructive schema integration tests.
 * Never falls back to DATABASE_URL (app/dev database).
 */
export function resolveTestDatabaseUrl(
  testDatabaseUrl: string | undefined,
): string {
  const url = (testDatabaseUrl ?? DEFAULT_TEST_DATABASE_URL).trim();
  assertSafeTestDatabaseUrl(url);
  return url;
}

export function assertSafeTestDatabaseUrl(url: string): void {
  let databaseName: string;

  try {
    const normalized = url
      .replace(/^postgresql:/i, 'http:')
      .replace(/^postgres:/i, 'http:');
    databaseName = decodeURIComponent(
      new URL(normalized).pathname.replace(/^\//, ''),
    );
  } catch {
    throw new Error(
      `TEST_DATABASE_URL is not a valid PostgreSQL connection string: ${url}`,
    );
  }

  if (!databaseName || databaseName.includes('/')) {
    throw new Error(
      `TEST_DATABASE_URL must include a database name ending in "_test" (got: "${databaseName}")`,
    );
  }

  if (!databaseName.endsWith('_test')) {
    throw new Error(
      `Refusing destructive schema tests against non-test database "${databaseName}". ` +
        `Use a database name ending in "_test" (e.g. investment_intelligence_test).`,
    );
  }
}
