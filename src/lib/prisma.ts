import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

/**
 * Raises Prisma's own client-side connection pool above its small default
 * (derived from CPU count, which is 1-2 on a typical serverless function).
 * Without this, a page that fires many queries in one Promise.all — like
 * the dashboard — ends up queueing most of them behind a handful of
 * connections instead of actually running concurrently, which matters a
 * lot when each round-trip has real network latency. Layered on in code
 * rather than requiring a hand-edited DATABASE_URL, since that variable is
 * managed by the Neon integration and gets overwritten on reconnect/sync.
 *
 * Also makes sure `pgbouncer=true` is set whenever DATABASE_URL points at a
 * Neon pooled endpoint (host contains "-pooler."). Neon's pooler runs
 * PgBouncer in transaction mode, which can't hold a prepared statement
 * across statements the way Prisma does by default; the flag tells Prisma
 * to skip prepared statements so it works correctly through the pooler,
 * the same connection that gives every serverless function instance a
 * real, shared pool instead of a private handful of direct Neon
 * connections each.
 */
function datasourceUrl(): string | undefined {
  const base = process.env.DATABASE_URL;
  if (!base) return undefined;
  let url = base;
  if (/-pooler\./.test(url) && !/[?&]pgbouncer=/.test(url)) {
    url += `${url.includes("?") ? "&" : "?"}pgbouncer=true`;
  }
  if (!/[?&]connection_limit=/.test(url)) {
    url += `${url.includes("?") ? "&" : "?"}connection_limit=10`;
  }
  return url;
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
    datasourceUrl: datasourceUrl(),
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
