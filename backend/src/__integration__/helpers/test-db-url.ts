// Integration tests TRUNCATE every table — make sure they can never be pointed
// at a real database by accident.
export function getTestDatabaseUrl(): string {
  const url = process.env.TEST_DATABASE_URL;
  if (!url) {
    throw new Error(
      'TEST_DATABASE_URL is not set. Point it at a throwaway Postgres, e.g.\n' +
      '  docker run -d -p 5433:5432 -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=rema_test postgres:16-alpine\n' +
      '  TEST_DATABASE_URL=postgresql://postgres:postgres@localhost:5433/rema_test npm run test:integration'
    );
  }
  const dbName = new URL(url).pathname.replace(/^\//, '');
  if (!/test/i.test(dbName)) {
    throw new Error(`Refusing to run integration tests: database name "${dbName}" must contain "test"`);
  }
  return url;
}
