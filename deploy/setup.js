/**
 * Jednorazowa konfiguracja bazy na serwerze – bez instalowania narzędzi:
 *   node setup.js
 * 1. tworzy tabele (plik init.sql), jeśli jeszcze nie istnieją,
 *    a przy aktualizacji dodaje brakujące tabele, kolumny i indeksy (istniejące dane zostają),
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
    const n = await upgrade();
    console.log(n ? `✔ Zaktualizowano strukturę bazy (${n} zmian)` : "• Struktura bazy jest aktualna");
  }

  const email = (process.env.ADMIN_EMAIL || "").toLowerCase();
  const password = process.env.ADMIN_PASSWORD || "";
  if (exists[0] && exists[0].t && (!email || !password)) {
    console.log("Gotowe. Uruchom ponownie aplikację w panelu.");
    return;
  }
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

/**
 * Aktualizacja istniejącej bazy do schematu z init.sql – tylko dodawanie (nic nie jest usuwane):
 * brakujące tabele, kolumny (nowe kolumny mają wartości domyślne lub są opcjonalne), indeksy i klucze obce.
 */
async function upgrade() {
  const sql = fs.readFileSync(path.join(__dirname, "init.sql"), "utf8");
  const statements = sql.split(/;\s*\n/).map((s) => s.replace(/^\s*--.*$/gm, "").trim()).filter(Boolean);
  const cols = await db.$queryRawUnsafe(`SELECT table_name, column_name FROM information_schema.columns WHERE table_schema = 'public'`);
  const have = new Set(cols.map((c) => `${c.table_name}.${c.column_name}`));
  const tables = new Set(cols.map((c) => c.table_name));
  let changes = 0;
  const run = async (st) => {
    try {
      await db.$executeRawUnsafe(st);
      changes++;
    } catch (e) {
      if (!/already exists|istnieje/i.test(e.message)) console.warn("  ! pominięto:", st.split("\n")[0], "–", e.message.split("\n")[0]);
    }
  };
  for (const st of statements) {
    const t = st.match(/^CREATE TABLE "([^"]+)"/);
    if (t) {
      if (!tables.has(t[1])) {
        await run(st);
        continue;
      }
      for (const line of st.split("\n").slice(1)) {
        const c = line.trim().replace(/,$/, "").match(/^"([^"]+)"\s+(.+)$/);
        if (c && !have.has(`${t[1]}.${c[1]}`)) await run(`ALTER TABLE "${t[1]}" ADD COLUMN IF NOT EXISTS "${c[1]}" ${c[2]}`);
      }
      continue;
    }
    if (/^CREATE (UNIQUE )?INDEX/.test(st)) {
      const name = st.match(/INDEX "([^"]+)"/);
      const found = name ? await db.$queryRawUnsafe(`SELECT 1 FROM pg_class WHERE relname = $1`, name[1]) : [1];
      if (!found.length) await run(st);
      continue;
    }
    if (/^ALTER TABLE .* ADD CONSTRAINT/.test(st)) {
      const name = st.match(/ADD CONSTRAINT "([^"]+)"/);
      const found = name ? await db.$queryRawUnsafe(`SELECT 1 FROM pg_constraint WHERE conname = $1`, name[1]) : [1];
      if (!found.length) await run(st);
    }
  }
  return changes;
}

main()
  .catch((e) => {
    console.error("✖", e.message);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
