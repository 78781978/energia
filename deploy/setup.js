/**
 * Jednorazowa konfiguracja bazy na serwerze – bez instalowania narzędzi:
 *   node setup.js
 * 1. tworzy tabele (plik init.sql), jeśli jeszcze nie istnieją,
 * 2. tworzy lub aktualizuje konto administratora z ADMIN_EMAIL / ADMIN_PASSWORD.
 * Bezpieczne do ponownego uruchomienia.
 */
const fs = require("fs");
const path = require("path");

for (const line of (fs.existsSync(path.join(__dirname, ".env")) ? fs.readFileSync(path.join(__dirname, ".env"), "utf8") : "").split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
  if (!m || line.trim().startsWith("#")) continue;
  const v = m[2].replace(/^(['"])(.*)\1$/, "$2");
  if (process.env[m[1]] === undefined) process.env[m[1]] = v;
}

const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");
const db = new PrismaClient();

async function main() {
  if (!process.env.DATABASE_URL) throw new Error("Brak DATABASE_URL w pliku .env");
  const exists = await db.$queryRawUnsafe(`SELECT to_regclass('public."User"')::text AS t`);
  if (!exists[0] || !exists[0].t) {
    const sql = fs.readFileSync(path.join(__dirname, "init.sql"), "utf8");
    const statements = sql
      .split(/;\s*\n/)
      .map((s) => s.replace(/^\s*--.*$/gm, "").trim())
      .filter(Boolean);
    for (const st of statements) await db.$executeRawUnsafe(st);
    console.log(`✔ Utworzono tabele (${statements.length} poleceń)`);
  } else {
    console.log("• Tabele już istnieją – pomijam");
  }

  const email = (process.env.ADMIN_EMAIL || "").toLowerCase();
  const password = process.env.ADMIN_PASSWORD || "";
  if (!email || password.length < 10) throw new Error("Ustaw ADMIN_EMAIL i ADMIN_PASSWORD (min. 10 znaków) w pliku .env");
  const found = await db.user.findUnique({ where: { email } });
  if (found) {
    await db.user.update({ where: { email }, data: { role: "ADMIN", isActive: true } });
    console.log(`• Administrator ${email} już istnieje (hasło bez zmian)`);
  } else {
    await db.user.create({ data: { email, role: "ADMIN", name: "Administrator", passwordHash: await bcrypt.hash(password, 12) } });
    console.log(`✔ Utworzono administratora ${email}`);
  }
  console.log("Gotowe. Usuń ADMIN_PASSWORD z pliku .env i uruchom ponownie aplikację w panelu.");
}

main()
  .catch((e) => {
    console.error("✖", e.message);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
