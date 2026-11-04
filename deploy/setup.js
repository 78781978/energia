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

// PostgreSQL albo MySQL/MariaDB – rozpoznawane po adresie bazy
const MYSQL = /^mysql:\/\//.test(process.env.DATABASE_URL || "");
const Q = MYSQL ? "`" : '"'; // znak cytowania nazw w SQL
const P = (n) => (MYSQL ? "?" : `$${n}`); // parametr zapytania

async function tableExists(name) {
  if (MYSQL) {
    const r = await db.$queryRawUnsafe("SELECT COUNT(*) AS n FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = ?", name);
    return Number(r[0].n) > 0;
  }
  const r = await db.$queryRawUnsafe(`SELECT to_regclass('public."${name}"')::text AS t`);
  return Boolean(r[0] && r[0].t);
}

async function main() {
  if (!process.env.DATABASE_URL) throw new Error("Brak DATABASE_URL w pliku .env");
  const existed = await tableExists("User");
  const exists = [{ t: existed }];
  if (!existed) {
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
  const cols = await db.$queryRawUnsafe(
    MYSQL
      ? "SELECT table_name AS t, column_name AS c FROM information_schema.columns WHERE table_schema = DATABASE()"
      : "SELECT table_name AS t, column_name AS c FROM information_schema.columns WHERE table_schema = 'public'",
  );
  const have = new Set(cols.map((c) => `${c.t}.${c.c}`));
  const tables = new Set(cols.map((c) => c.t));
  const found = async (sql, ...args) => (await db.$queryRawUnsafe(sql, ...args)).length > 0;
  let changes = 0;
  const run = async (st) => {
    try {
      await db.$executeRawUnsafe(st);
      changes++;
    } catch (e) {
      if (!/already exists|istnieje|Duplicate/i.test(e.message)) console.warn("  ! pominięto:", st.split("\n")[0], "–", e.message.split("\n")[0]);
    }
  };
  for (const st of statements) {
    const t = st.match(new RegExp(`^CREATE TABLE ${Q}([^${Q}]+)${Q}`));
    if (t) {
      if (!tables.has(t[1])) {
        await run(st);
        continue;
      }
      for (const line of st.split("\n").slice(1)) {
        const l = line.trim().replace(/,$/, "");
        const c = l.match(new RegExp(`^${Q}([^${Q}]+)${Q}\\s+(.+)$`));
        if (c && !have.has(`${t[1]}.${c[1]}`)) await run(`ALTER TABLE ${Q}${t[1]}${Q} ADD COLUMN IF NOT EXISTS ${Q}${c[1]}${Q} ${c[2]}`);
        // MySQL/MariaDB: indeksy są zapisane w CREATE TABLE – dodaj brakujące
        const ix = MYSQL ? l.match(/^(UNIQUE )?INDEX `([^`]+)`(\(.+\))$/) : null;
        if (ix && !(await found("SELECT 1 FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = ? AND index_name = ?", t[1], ix[2])))
          await run(`ALTER TABLE ${Q}${t[1]}${Q} ADD ${ix[1] || ""}INDEX ${Q}${ix[2]}${Q}${ix[3]}`);
      }
      continue;
    }
    if (/^CREATE (UNIQUE )?INDEX/.test(st)) {
      const name = st.match(new RegExp(`INDEX ${Q}([^${Q}]+)${Q}`));
      const sqlI = MYSQL ? "SELECT 1 FROM information_schema.statistics WHERE table_schema = DATABASE() AND index_name = ?" : `SELECT 1 FROM pg_class WHERE relname = ${P(1)}`;
      if (name && !(await found(sqlI, name[1]))) await run(st);
      continue;
    }
    if (/^ALTER TABLE .* ADD CONSTRAINT/.test(st)) {
      const name = st.match(new RegExp(`ADD CONSTRAINT ${Q}([^${Q}]+)${Q}`));
      const sqlC = MYSQL
        ? "SELECT 1 FROM information_schema.table_constraints WHERE constraint_schema = DATABASE() AND constraint_name = ?"
        : `SELECT 1 FROM pg_constraint WHERE conname = ${P(1)}`;
      if (name && !(await found(sqlC, name[1]))) await run(st);
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
