import type { Config } from 'jest';

// Integration tests hit a real Postgres (TEST_DATABASE_URL) and are run
// separately from the fast unit suite:  npm run test:integration
const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__integration__/**/*.test.ts'],
  moduleFileExtensions: ['ts', 'js', 'json'],
  transform: {
    '^.+\\.ts$': ['ts-jest', { tsconfig: './tsconfig.test.json' }],
  },
  setupFiles: ['<rootDir>/src/__integration__/helpers/env.ts'],
  globalSetup: '<rootDir>/src/__integration__/helpers/global-setup.ts',
  // Test files share one database — run them one at a time
  maxWorkers: 1,
  testTimeout: 30_000,
};

export default config;
