#!/usr/bin/env bash
# Buduje gotową paczkę do wgrania na hosting Node.js (np. cyber_Folks).
# Wynik: dist/energia-hosting.zip (serwer + pliki statyczne + init.sql + setup.js + start.js)
#
#   bash scripts/paczka-hosting.sh                 # baza PostgreSQL → dist/energia-hosting.zip
#   BAZA=mariadb bash scripts/paczka-hosting.sh    # baza MariaDB 10.6+ / MySQL 8 → dist/energia-hosting-mariadb.zip
set -euo pipefail
cd "$(dirname "$0")/.."

BAZA="${BAZA:-postgresql}"
case "$BAZA" in
  postgresql|postgres|pg) BAZA=postgresql; OUT=dist/energia-hosting; ZIP=energia-hosting.zip; BUILD_URL="postgresql://budowanie:x@localhost:5432/x"
    EXAMPLE_URL='postgresql://UZYTKOWNIK:HASLO@localhost:5432/NAZWA_BAZY?schema=public' ;;
  mariadb|mysql) BAZA=mariadb; OUT=dist/energia-hosting-mariadb; ZIP=energia-hosting-mariadb.zip; BUILD_URL="mysql://budowanie:x@localhost:3306/x"
    EXAMPLE_URL='mysql://UZYTKOWNIK:HASLO@localhost:3306/NAZWA_BAZY' ;;
  *) echo "Nieznana baza: $BAZA (postgresql albo mariadb)"; exit 1 ;;
esac
rm -rf "$OUT" "dist/$ZIP" dist/prisma && mkdir -p "$OUT" dist/prisma

echo "▸ Schemat bazy: $BAZA"
if [[ "$BAZA" == mariadb ]]; then
  node scripts/schema-mysql.mjs prisma/schema.prisma dist/prisma/schema.prisma
else
  sed 's/provider = "sqlite"/provider = "postgresql"/' prisma/schema.prisma > dist/prisma/schema.prisma
fi
npx prisma generate --schema dist/prisma/schema.prisma >/dev/null
npx prisma migrate diff --from-empty --to-schema-datamodel dist/prisma/schema.prisma --script > "$OUT/init.sql"

echo "▸ Budowanie aplikacji"
rm -rf .next/standalone # bez pozostałości z poprzednich uruchomień (np. lokalnego .env)
DATABASE_URL="$BUILD_URL" npx next build

echo "▸ Składanie paczki"
cp -r .next/standalone/. "$OUT/"
mkdir -p "$OUT/.next" && cp -r .next/static "$OUT/.next/static"
rm -rf "$OUT/public" && cp -r public "$OUT/public"
cp deploy/start.js deploy/setup.js deploy/kopia.sh deploy/cloudflare.js "$OUT/"
# setup.js potrzebuje bcryptjs poza paczką Next.js
mkdir -p "$OUT/node_modules" && cp -r node_modules/bcryptjs "$OUT/node_modules/"
cp dist/prisma/schema.prisma "$OUT/schema.prisma"
# skrypty dla panelu hostingu („Uruchom skrypt JS” / npm run …) – wersje działające na serwerze, bez narzędzi deweloperskich
node -e '
const fs = require("fs"); const f = process.argv[1];
const p = JSON.parse(fs.readFileSync(f, "utf8"));
p.scripts = { start: "node start.js", setup: "node setup.js", kopia: "bash kopia.sh --jesli-potrzeba" };
delete p.devDependencies;
fs.writeFileSync(f, JSON.stringify(p, null, 2) + "\n");
' "$OUT/package.json"
# lokalne pliki nie mogą trafić na serwer
rm -f "$OUT/.env" "$OUT"/prisma/*.db
cat > "$OUT/.env.example" <<'ENV'
SITE_URL="https://twoja-domena.pl"
DATABASE_URL="__EXAMPLE_URL__"
STORAGE_DIR="/home/LOGIN/energia-pliki"
ADMIN_EMAIL="admin@twoja-domena.pl"
ADMIN_PASSWORD="UstawSilneHaslo123"
SMTP_HOST="mail.twoja-domena.pl"
SMTP_PORT="465"
SMTP_USER="powiadomienia@twoja-domena.pl"
SMTP_PASSWORD=""
MAIL_FROM="Energia w Biznesie <powiadomienia@twoja-domena.pl>"
NOTIFY_EMAIL="biuro@twoja-domena.pl"
# Captcha (Cloudflare Turnstile) – klucze tworzy node cloudflare.js
TURNSTILE_SITE_KEY=""
TURNSTILE_SECRET_KEY=""
# Klucz zadań (przypomnienia) – losowy ciąg min. 32 znaki
CRON_SECRET=""
# 1 = ruch przez proxy Cloudflare
BEHIND_CLOUDFLARE=""
# 1 = aplikacja sama robi codzienną kopię (kopia.sh) – zalecane dodatkowo do zadania cron
AUTO_KOPIA="1"
KOPIE_DIR="/home/LOGIN/kopie"
# Antywirus ClamAV (opcjonalnie, jeśli hosting udostępnia clamd): CLAMAV_HOST="127.0.0.1:3310" lub CLAMAV_SOCKET="/sciezka/clamd.sock"
CLAMAV_HOST=""
CLAMAV_REQUIRED=""
ENV

echo "▸ Przywracanie klienta bazy dla środowiska lokalnego (SQLite)"
npx prisma generate >/dev/null

sed -i "s#__EXAMPLE_URL__#$EXAMPLE_URL#" "$OUT/.env.example"
(cd dist && zip -qr "$ZIP" "$(basename "$OUT")")
echo "✔ Gotowe: dist/$ZIP ($(du -h "dist/$ZIP" | cut -f1), baza: $BAZA)"
