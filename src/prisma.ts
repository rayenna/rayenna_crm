import { PrismaClient } from '@prisma/client';

/**
 * Neon pooler + Prisma’s default pool (~num_cpus*2+1, often 21) can exhaust
 * free-tier slots and surface as login P2024 timeouts. Cap unless already set.
 */
function resolveDatabaseUrl(): string | undefined {
  const raw = process.env.DATABASE_URL;
  if (!raw) return undefined;
  try {
    const url = new URL(raw);
    if (!url.searchParams.has('connection_limit')) {
      url.searchParams.set(
        'connection_limit',
        process.env.PRISMA_CONNECTION_LIMIT?.trim() || '5',
      );
    }
    if (!url.searchParams.has('pool_timeout')) {
      url.searchParams.set('pool_timeout', '20');
    }
    return url.toString();
  } catch {
    return raw;
  }
}

const prisma = new PrismaClient({
  datasources: {
    db: { url: resolveDatabaseUrl() },
  },
});

export default prisma;
