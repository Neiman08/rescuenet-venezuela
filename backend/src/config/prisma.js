import { PrismaClient } from "@prisma/client";

// Append pool params to DATABASE_URL so Prisma's connection pool doesn't hit the
// 10-second default pool_timeout on Render free tier with slow queries.
function withPoolParams(url) {
  if (!url || url.includes("pool_timeout")) return url;
  const sep = url.includes("?") ? "&" : "?";
  return `${url}${sep}connection_limit=5&pool_timeout=60`;
}

export const prisma = new PrismaClient({
  datasources: { db: { url: withPoolParams(process.env.DATABASE_URL) } },
  log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
});

// Update planner statistics on startup so new indexes created by migrations are used
// immediately instead of waiting hours for autovacuum on Render free tier.
prisma.$connect().then(() =>
  prisma.$executeRaw`ANALYZE "ImportedHumanitarianRecord"`
).catch(() => {});
