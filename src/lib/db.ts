import { PrismaClient } from "@prisma/client";

/**
 * Limit połączeń z bazą na jeden proces aplikacji.
 * Bez niego Prisma otwiera do (2 × liczba rdzeni serwera + 1) połączeń – na serwerze hostingowym z wieloma rdzeniami
 * mogłoby to przekroczyć limit połączeń użytkownika bazy (max_user_connections). Domyślnie 5; zmiana: DB_POOL=… w .env
 * albo connection_limit=… w DATABASE_URL (ma pierwszeństwo).
 */
export function withPoolLimit(url: string | undefined): string | undefined {
  if (!url || !/^(mysql|postgres(ql)?):\/\//.test(url)) return url;
  if (/[?&]connection_limit=/.test(url)) return url;
  const limit = Math.max(1, Math.min(50, Number(process.env.DB_POOL) || 5));
  return `${url}${url.includes("?") ? "&" : "?"}connection_limit=${limit}&pool_timeout=20`;
}

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

const url = withPoolLimit(process.env.DATABASE_URL);
// Jedna wspólna pula połączeń na proces – także w produkcji (Next.js może załadować ten moduł w kilku częściach aplikacji)
export const db = (globalForPrisma.prisma ??= new PrismaClient(url ? { datasources: { db: { url } } } : undefined));

/**
 * Filtr „zawiera” bez rozróżniania wielkości liter.
 * PostgreSQL wymaga `mode: "insensitive"`; SQLite i MariaDB/MySQL (porównanie utf8mb4_unicode_ci) porównują bez rozróżniania.
 */
export function ci(value: string): { contains: string } {
  const pg = /^postgres(ql)?:/.test(process.env.DATABASE_URL ?? "");
  return (pg ? { contains: value, mode: "insensitive" } : { contains: value }) as { contains: string };
}
