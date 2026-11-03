#!/usr/bin/env bash
# Kopia zapasowa bazy PostgreSQL i plików klientów – do uruchamiania z harmonogramu zadań (cron) hostingu, np. codziennie o 2:30:
#   30 2 * * *  bash /home/LOGIN/energia/kopia.sh >> /home/LOGIN/kopie/kopia.log 2>&1
# Kopie trafiają do KOPIE_DIR (domyślnie ~/kopie), starsze niż KOPIE_DNI dni są usuwane.
# Raz w tygodniu skopiuj najnowszą kopię poza hosting (dysk w chmurze, komputer w biurze).
set -euo pipefail
cd "$(dirname "$0")"

# wczytaj DATABASE_URL i STORAGE_DIR z .env
set -a
# shellcheck disable=SC1091
source <(grep -E '^(DATABASE_URL|STORAGE_DIR)=' .env)
set +a

KOPIE_DIR="${KOPIE_DIR:-$HOME/kopie}"
KOPIE_DNI="${KOPIE_DNI:-14}"
STAMP="$(date +%Y-%m-%d_%H%M)"
umask 077
mkdir -p "$KOPIE_DIR"

# baza (format własny pg_dump – odtworzenie: pg_restore --clean -d "$DATABASE_URL" plik.dump)
URL="${DATABASE_URL%%\?*}"
pg_dump --format=custom --no-owner --file "$KOPIE_DIR/baza_$STAMP.dump" "$URL"

# pliki klientów (faktury, umowy, logo, obrazy z panelu)
tar -czf "$KOPIE_DIR/pliki_$STAMP.tar.gz" -C "$(dirname "$STORAGE_DIR")" "$(basename "$STORAGE_DIR")"

find "$KOPIE_DIR" -name 'baza_*.dump' -mtime +"$KOPIE_DNI" -delete
find "$KOPIE_DIR" -name 'pliki_*.tar.gz' -mtime +"$KOPIE_DNI" -delete
echo "$(date '+%F %T') kopia OK: baza_$STAMP.dump, pliki_$STAMP.tar.gz"
