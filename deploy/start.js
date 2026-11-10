/**
 * Plik startowy aplikacji na hostingu (np. cyber_Folks → DirectAdmin → Node.js).
 * 1) Wczytuje zmienne z pliku .env obok tego pliku (jeśli istnieje).
 * 2) Przy pierwszym uruchomieniu i po wgraniu nowej wersji (zmiana init.sql) sam uruchamia setup.js:
 *    tworzy lub aktualizuje tabele w bazie i – jeśli w .env jest ADMIN_PASSWORD – konto administratora.
 *    Wynik zapisuje w pliku setup.log (widoczny w menedżerze plików). Bez SSH i bez „Uruchom skrypt JS”.
 * 3) Uruchamia serwer Next.js.
 * W panelu hostingu jako „plik startowy” (Application startup file) wskaż: start.js
 */
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { spawnSync } = require("child_process");

function loadEnv(file) {
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
    if (!m || line.trim().startsWith("#")) continue;
    let v = m[2];
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    if (process.env[m[1]] === undefined) process.env[m[1]] = v;
  }
}

function autoSetup() {
  const sql = path.join(__dirname, "init.sql");
  const setup = path.join(__dirname, "setup.js");
  const marker = path.join(__dirname, ".setup-done");
  if (process.env.AUTO_SETUP === "0" || !fs.existsSync(sql) || !fs.existsSync(setup) || !process.env.DATABASE_URL) return;
  const fingerprint = crypto.createHash("sha1").update(fs.readFileSync(sql)).digest("hex");
  const done = fs.existsSync(marker) ? fs.readFileSync(marker, "utf8").trim() : "";
  if (done === fingerprint) return;
  const r = spawnSync(process.execPath, [setup], { cwd: __dirname, env: process.env, encoding: "utf8", timeout: 180000 });
  const out = `[${new Date().toISOString()}] setup.js – kod wyjścia ${r.status}\n${r.stdout || ""}${r.stderr || ""}${r.error ? String(r.error) + "\n" : ""}`;
  try {
    fs.appendFileSync(path.join(__dirname, "setup.log"), out + "\n");
  } catch {}
  console.log(out);
  if (r.status === 0) fs.writeFileSync(marker, fingerprint + "\n");
}

loadEnv(path.join(__dirname, ".env"));
process.env.NODE_ENV = process.env.NODE_ENV || "production";
process.env.HOSTNAME = process.env.HOSTNAME || "0.0.0.0";
try {
  autoSetup();
} catch (e) {
  console.error("[setup] ", e);
}
require("./server.js");
