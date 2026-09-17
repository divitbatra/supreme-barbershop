import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

/** Postgres `exclusion_violation` — raised by `appointments_no_overlap`. */
export function isOverlapViolation(error: unknown): boolean {
  const e = error as { code?: string; meta?: { code?: string }; message?: string };
  return (
    e?.code === '23P01' ||
    e?.meta?.code === '23P01' ||
    Boolean(e?.message?.includes('appointments_no_overlap'))
  );
}
