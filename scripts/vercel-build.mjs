/**
 * Budowanie na Vercel (tymczasowy podgląd). Vercel uruchamia ten skrypt zamiast `build` (skrypt `vercel-build`).
 * 1. przełącza bazę na PostgreSQL (SQLite nie działa na Vercelu),
 * 2. tworzy/aktualizuje tabele (prisma db push – tylko dodaje, nie usuwa danych),
 * 3. tworzy administratora (ADMIN_EMAIL/ADMIN_PASSWORD) i – przy SEED_DEMO=1 – dane demonstracyjne,
 * 4. buduje aplikację.
 */
import { execSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";

if (!process.env.VERCEL && process.env.VERCEL_BUILD_LOCAL !== "1") {
  console.error("✖ Ten skrypt zmienia prisma/schema.prisma na PostgreSQL – uruchamiaj go tylko na Vercelu (lub z VERCEL_BUILD_LOCAL=1 w kopii projektu).");
  process.exit(1);
}
const run = (cmd, env = {}) => execSync(cmd, { stdio: "inherit", env: { ...process.env, ...env } });
const url = process.env.DATABASE_URL || "";
if (!/^postgres(ql)?:\/\//.test(url)) {
  console.error("✖ Ustaw DATABASE_URL (PostgreSQL, np. Neon z Vercel Marketplace) w ustawieniach projektu Vercel.");
  process.exit(1);
}
const schema = readFileSync("prisma/schema.prisma", "utf8").replace('provider = "sqlite"', 'provider = "postgresql"');
writeFileSync("prisma/schema.prisma", schema);
console.log("▸ Baza: PostgreSQL");
run("npx prisma generate");
// do zmian struktury używamy połączenia bezpośredniego (bez puli), jeśli Neon je udostępnia
const direct = process.env.DATABASE_URL_UNPOOLED || process.env.POSTGRES_URL_NON_POOLING || url;
run("npx prisma db push --skip-generate", { DATABASE_URL: direct });
if (process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD) {
  run(`npx tsx prisma/seed.ts${process.env.SEED_DEMO === "1" ? " --demo" : ""}`, { DATABASE_URL: direct });
}
run("npx next build");
