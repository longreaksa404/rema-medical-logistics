import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.test.ts'],
  moduleFileExtensions: ['ts', 'js', 'json'],
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      tsconfig: {
        // Add jest types so describe/test/expect are recognised without imports
        types: ['jest', 'node'],
        strict: false,
        esModuleInterop: true,
        skipLibCheck: true,
      },
    }],
  },
  // Never import from prisma, express, or any external service in tests.
  // Tests must be pure utility functions only.
  collectCoverageFrom: [
    'src/utils/**/*.ts',
    '!src/utils/__tests__/**',
  ],
};

export default config;