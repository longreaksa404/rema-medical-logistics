import { execSync } from 'child_process';
import { getTestDatabaseUrl } from './test-db-url';

// Bring the test database up to the latest migration once per run
export default function globalSetup(): void {
  const url = getTestDatabaseUrl();
  execSync('npx prisma migrate deploy', {
    stdio: 'inherit',
    env: { ...process.env, DATABASE_URL: url, DIRECT_URL: url },
  });
}
