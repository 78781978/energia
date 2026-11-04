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

  Link dla telefonu / klienta (bez logowania do GitHuba):
    zakładka PORTS → prawy klik na 3000 → Port Visibility → Public → skopiuj adres.
  Uwaga: publiczny link + hasła demo = każdy z linkiem może wejść do panelu.
    Przed udostępnieniem dopisz do .env: PREVIEW_USER="podglad" i PREVIEW_PASSWORD="…"
    (strona zapyta o to hasło) i uruchom serwer ponownie (Ctrl+C, potem: npm run dev).
TXT
