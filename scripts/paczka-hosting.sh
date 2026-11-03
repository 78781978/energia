#!/usr/bin/env bash
# Buduje gotową paczkę do wgrania na hosting Node.js (np. cyber_Folks).
# Wynik: dist/energia-hosting.zip (serwer + pliki statyczne + init.sql + setup.js + start.js)
#
#   bash scripts/paczka-hosting.sh            # baza PostgreSQL (zalecane)
set -euo pipefail
cd "$(dirname "$0")/.."

OUT=dist/energia-hosting
rm -rf dist && mkdir -p "$OUT"

echo "▸ Schemat bazy dla PostgreSQL"
mkdir -p dist/prisma
sed 's/provider = "sqlite"/provider = "postgresql"/' prisma/schema.prisma > dist/prisma/schema.prisma
npx prisma generate --schema dist/prisma/schema.prisma >/dev/null
npx prisma migrate diff --from-empty --to-schema-datamodel dist/prisma/schema.prisma --script > "$OUT/init.sql"

echo "▸ Budowanie aplikacji"
DATABASE_URL="postgresql://budowanie:x@localhost:5432/x" npx next build

echo "▸ Składanie paczki"
cp -r .next/standalone/. "$OUT/"
mkdir -p "$OUT/.next" && cp -r .next/static "$OUT/.next/static"
cp -r public "$OUT/public"
cp deploy/start.js deploy/setup.js deploy/kopia.sh "$OUT/"
# setup.js potrzebuje bcryptjs poza paczką Next.js
mkdir -p "$OUT/node_modules" && cp -r node_modules/bcryptjs "$OUT/node_modules/"
cp dist/prisma/schema.prisma "$OUT/schema.prisma"
# lokalne pliki nie mogą trafić na serwer
rm -f "$OUT/.env" "$OUT"/prisma/*.db
cat > "$OUT/.env.example" <<'ENV'
SITE_URL="https://twoja-domena.pl"
DATABASE_URL="postgresql://UZYTKOWNIK:HASLO@localhost:5432/NAZWA_BAZY?schema=public"
STORAGE_DIR="/home/LOGIN/energia-pliki"
ADMIN_EMAIL="admin@twoja-domena.pl"
ADMIN_PASSWORD="UstawSilneHaslo123"
SMTP_HOST="mail.twoja-domena.pl"
SMTP_PORT="465"
SMTP_USER="powiadomienia@twoja-domena.pl"
SMTP_PASSWORD=""
MAIL_FROM="Energia w Biznesie <powiadomienia@twoja-domena.pl>"
NOTIFY_EMAIL="biuro@twoja-domena.pl"
ENV

echo "▸ Przywracanie klienta bazy dla środowiska lokalnego (SQLite)"
npx prisma generate >/dev/null

(cd dist && rm -f energia-hosting.zip && zip -qr energia-hosting.zip energia-hosting)
echo "✔ Gotowe: dist/energia-hosting.zip ($(du -h dist/energia-hosting.zip | cut -f1))"
