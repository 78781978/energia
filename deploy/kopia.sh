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

# --jesli-potrzeba: tryb automatyczny z aplikacji – pomiń, jeśli dzisiejsza kopia już istnieje (młodsza niż 20 h)
if [[ "${1:-}" == "--jesli-potrzeba" ]] && [[ -n "$(find "$KOPIE_DIR" -name 'baza_*' -mmin -1200 2>/dev/null | head -1)" ]]; then
  exit 0
fi
# blokada przed równoczesnym uruchomieniem (cron + aplikacja)
exec 9>"$KOPIE_DIR/.kopia.lock"
if command -v flock >/dev/null 2>&1 && ! flock -n 9; then
  echo "kopia już trwa – pomijam"
  exit 0
fi

# baza: PostgreSQL – pg_dump (odtworzenie: pg_restore --clean --no-owner -d "$DATABASE_URL" plik.dump)
#       MariaDB/MySQL – mariadb-dump (odtworzenie: gunzip < plik.sql.gz | mariadb NAZWA_BAZY)
URL="${DATABASE_URL%%\?*}"
if [[ "$URL" == mysql:* ]]; then
  # MySQL / MariaDB – hasło w pliku tymczasowym (nie widać go na liście procesów)
  CNF="$(mktemp)"; trap 'rm -f "$CNF"' EXIT
  DBNAME="$(node -e 'const u=new URL(process.argv[1]);const d=decodeURIComponent;console.log(d(u.pathname.slice(1)));require("fs").writeFileSync(process.argv[2],`[client]\nuser=${d(u.username)}\npassword="${d(u.password).replace(/"/g,"\\\"")}"\nhost=${u.hostname||"localhost"}\nport=${u.port||3306}\n`)' "$URL" "$CNF")"
  DUMP="$(command -v mariadb-dump || command -v mysqldump)"
  "$DUMP" --defaults-extra-file="$CNF" --single-transaction --quick --default-character-set=utf8mb4 "$DBNAME" | gzip > "$KOPIE_DIR/baza_$STAMP.sql.gz"
elif [[ "$URL" == file:* ]]; then
  # SQLite (środowisko testowe) – kopia pliku bazy
  DBF="${URL#file:}"; [[ "$DBF" = /* ]] || DBF="prisma/$DBF"
  cp "$DBF" "$KOPIE_DIR/baza_$STAMP.dump"
else
  pg_dump --format=custom --no-owner --file "$KOPIE_DIR/baza_$STAMP.dump" "$URL"
fi

# pliki klientów (faktury, umowy, logo, obrazy z panelu)
tar -czf "$KOPIE_DIR/pliki_$STAMP.tar.gz" -C "$(dirname "$STORAGE_DIR")" "$(basename "$STORAGE_DIR")"

find "$KOPIE_DIR" -name 'baza_*' -mtime +"$KOPIE_DNI" -delete
find "$KOPIE_DIR" -name 'pliki_*.tar.gz' -mtime +"$KOPIE_DNI" -delete
echo "$(date '+%F %T') kopia OK: $(ls "$KOPIE_DIR" | grep "baza_$STAMP"), pliki_$STAMP.tar.gz"
