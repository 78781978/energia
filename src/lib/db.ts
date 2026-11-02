import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const db = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;

/**
 * Filtr „zawiera” bez rozróżniania wielkości liter.
 * PostgreSQL wymaga `mode: "insensitive"`; SQLite porównuje litery ASCII bez rozróżniania.
 */
export function ci(value: string): { contains: string } {
  const pg = /^postgres(ql)?:/.test(process.env.DATABASE_URL ?? "");
  return (pg ? { contains: value, mode: "insensitive" } : { contains: value }) as { contains: string };
}
