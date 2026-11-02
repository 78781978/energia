/**
 * Plik startowy aplikacji na hostingu (np. cyber_Folks → DirectAdmin → Node.js).
 * Wczytuje zmienne z pliku .env obok tego pliku (jeśli istnieje), a potem uruchamia serwer Next.js.
 * W panelu hostingu jako „plik startowy” (Application startup file) wskaż: start.js
 */
const fs = require("fs");
const path = require("path");

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

loadEnv(path.join(__dirname, ".env"));
process.env.NODE_ENV = process.env.NODE_ENV || "production";
process.env.HOSTNAME = process.env.HOSTNAME || "0.0.0.0";
require("./server.js");
