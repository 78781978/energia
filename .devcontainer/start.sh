#!/usr/bin/env bash
# Każde uruchomienie Codespace: najnowsza wersja z GitHuba + aktualne biblioteki i baza. Bez wpisywania poleceń.
set -uo pipefail
echo "▸ Pobieranie najnowszej wersji z GitHuba…"
branch="$(git rev-parse --abbrev-ref HEAD)"
git fetch origin "$branch" --quiet && git merge --ff-only "origin/$branch" --quiet || echo "! nie udało się pobrać zmian automatycznie (lokalne zmiany?) – kontynuuję na obecnej wersji"
echo "▸ Biblioteki…"
npm install --no-audit --no-fund --loglevel=error
[ -f .env ] || cp .env.example .env
echo "▸ Baza danych…"
npx prisma db push --skip-generate >/dev/null && npx prisma generate >/dev/null
echo "✔ Gotowe – strona uruchomi się za chwilę (port 3000)."
