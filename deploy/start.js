/**
 * Plik startowy aplikacji na hostingu (np. cyber_Folks → DirectAdmin → Node.js).
 * 1) Wczytuje zmienne z pliku .env obok tego pliku (jeśli istnieje).
 * 2) Przy pierwszym uruchomieniu i po wgraniu nowej wersji (zmiana init.sql) sam uruchamia setup.js:
 *    tworzy lub aktualizuje tabele w bazie i – jeśli w .env jest ADMIN_PASSWORD – konto administratora.
 *    Wynik zapisuje w pliku setup.log (widoczny w menedżerze plików). Bez SSH i bez „Uruchom skrypt JS”.
 * 3) Ogranicza liczbę wątków (hosting z CloudLinux liczy wątki do limitu procesów NPROC; domyślnie Node.js i silnik bazy
 *    tworzą tyle wątków, ile rdzeni ma cały serwer). Pulę V8 ustawia NODE_OPTIONS=--v8-pool-size=2 w panelu aplikacji.
 * 4) Uruchamia serwer Next.js.
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
  // po nieudanej próbie nie ponawiamy przy każdym starcie – najwyżej raz na 10 minut
  const failed = path.join(__dirname, ".setup-failed");
  if (fs.existsSync(failed) && Date.now() - fs.statSync(failed).mtimeMs < 10 * 60e3) return;
  const r = spawnSync(process.execPath, ["--v8-pool-size=1", setup], { cwd: __dirname, env: process.env, encoding: "utf8", timeout: 90000 });
  const out = `[${new Date().toISOString()}] setup.js – kod wyjścia ${r.status}\n${r.stdout || ""}${r.stderr || ""}${r.error ? String(r.error) + "\n" : ""}`;
  try {
    fs.appendFileSync(path.join(__dirname, "setup.log"), out + "\n");
  } catch {}
  console.log(out);
  if (r.status === 0) {
    fs.writeFileSync(marker, fingerprint + "\n");
    try {
      fs.unlinkSync(failed);
    } catch {}
  } else fs.writeFileSync(failed, new Date().toISOString() + "\n");
}

loadEnv(path.join(__dirname, ".env"));
process.env.NODE_ENV = process.env.NODE_ENV || "production";
process.env.HOSTNAME = process.env.HOSTNAME || "0.0.0.0";
// mniej wątków = mniej „procesów” w limicie hostingu (NPROC); wystarczające dla ruchu strony i portalu
process.env.UV_THREADPOOL_SIZE = process.env.UV_THREADPOOL_SIZE || "2";
process.env.TOKIO_WORKER_THREADS = process.env.TOKIO_WORKER_THREADS || "2";
try {
  autoSetup();
} catch (e) {
  console.error("[setup] ", e);
}
require("./server.js");
