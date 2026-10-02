import { getTestDatabaseUrl } from './test-db-url';

// Runs before each test file, before any app module (and PrismaClient) is imported
const url = getTestDatabaseUrl();
process.env.DATABASE_URL = url;
process.env.DIRECT_URL   = url;
process.env.NODE_ENV     = 'test';
process.env.JWT_SECRET   = process.env.JWT_SECRET || 'integration-test-secret-integration-test-secret';
