#!/usr/bin/env bash
# Jednorazowe przygotowanie podglądu w Codespaces: zależności, plik .env, baza SQLite i dane demonstracyjne.
set -euo pipefail
npm ci
[ -f .env ] || cp .env.example .env
npx prisma db push --skip-generate >/dev/null
npx prisma generate >/dev/null
npm run db:seed -- --demo
cat <<'TXT'

✔ Podgląd gotowy. Serwer startuje automatycznie (port 3000) – link otworzy się w przeglądarce.
  Panel administratora: /portal/logowanie/  ·  admin@example.com / ZmienToHaslo123!
  Klient demo:          klient.demo@example.com / KlientDemo2026
TXT
