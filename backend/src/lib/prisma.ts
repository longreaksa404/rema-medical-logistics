import { PrismaClient } from '@prisma/client';

// ─── PRISMA SINGLETON ─────────────────────────────────────────────────────────
// A single shared PrismaClient instance for the entire application.
// Without this, each service file's `new PrismaClient()` creates its own
// connection pool — 12 pools against one Supabase free-tier database causes
// connection exhaustion under any real load.
//
// Pattern follows Prisma's official recommendation for long-running Node servers:
// https://www.prisma.io/docs/guides/performance-and-optimization/connection-management
//
// In development, HMR (hot-module reload) can re-execute module code and create
// multiple instances. The global guard below prevents that.

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === 'development'
        ? ['query', 'error', 'warn']
        : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}