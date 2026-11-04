#!/usr/bin/env bash
# Wdrożenie gotowej paczki na hosting cyber_Folks przez SSH (używane przez GitHub Actions, można też ręcznie).
#
#   SSH_HOST=… SSH_USER=… APP_DIR=/home/LOGIN/energia ZIP=dist/energia-hosting-mariadb.zip bash scripts/wdroz-cyberfolks.sh
#
# Zmienne: SSH_HOST, SSH_USER, APP_DIR (katalog aplikacji), ZIP (paczka), opcjonalnie:
#   SSH_PORT (domyślnie 22), SSH_KEY (plik klucza), NODE_ACTIVATE (skrypt „activate” środowiska Node.js z panelu),
#   RESTART_CMD (własne polecenie restartu), SITE_URL (adres do sprawdzenia po wdrożeniu).
#
# Kolejność: kopia zapasowa → pliki (bez .env, dokumentów klientów i kopii) → node setup.js → restart → test strony.
set -euo pipefail

: "${SSH_HOST:?Ustaw SSH_HOST}" "${SSH_USER:?Ustaw SSH_USER}" "${APP_DIR:?Ustaw APP_DIR}" "${ZIP:?Ustaw ZIP}"
SSH_PORT="${SSH_PORT:-22}"
SSH_OPTS=(-p "$SSH_PORT" -o BatchMode=yes -o ConnectTimeout=20 -o ServerAliveInterval=15)
[[ -n "${SSH_KEY:-}" ]] && SSH_OPTS+=(-i "$SSH_KEY")
[[ -n "${SSH_KNOWN_HOSTS_FILE:-}" ]] && SSH_OPTS+=(-o UserKnownHostsFile="$SSH_KNOWN_HOSTS_FILE" -o StrictHostKeyChecking=yes)
TARGET="$SSH_USER@$SSH_HOST"
remote() { ssh "${SSH_OPTS[@]}" "$TARGET" "$@"; }
q() { printf "%q" "$1"; }
ACT=""
[[ -n "${NODE_ACTIVATE:-}" ]] && ACT="source $(q "$NODE_ACTIVATE") && "

WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT
unzip -q "$ZIP" -d "$WORK"
SRC="$(find "$WORK" -mindepth 1 -maxdepth 1 -type d | head -1)"
[[ -f "$SRC/server.js" ]] || { echo "✖ W paczce nie ma server.js"; exit 1; }

echo "▸ 1/5 Kopia zapasowa przed wdrożeniem"
remote "if [ -f $(q "$APP_DIR/kopia.sh") ] && [ -f $(q "$APP_DIR/.env") ]; then cd $(q "$APP_DIR") && ${ACT}bash kopia.sh; else echo '• pierwsze wdrożenie (brak kopia.sh lub .env) – pomijam kopię'; fi" || echo "! kopia nie powiodła się – kontynuuję (sprawdź kopia.sh na serwerze)"

echo "▸ 2/5 Wgrywanie plików"
remote "mkdir -p $(q "$APP_DIR")"
rsync -az --delete --delete-delay \
  --exclude '/.env' --exclude '/tmp/' --exclude '/storage/' --exclude '/kopie/' --exclude '*.log' \
  -e "ssh ${SSH_OPTS[*]}" "$SRC/" "$TARGET:$APP_DIR/"

echo "▸ 3/5 Aktualizacja bazy (node setup.js)"
remote "cd $(q "$APP_DIR") && if [ -f .env ]; then ${ACT}node setup.js; else echo '! brak .env – utwórz go (zob. WDROZENIE-CYBERFOLKS.md) i uruchom: node setup.js'; fi"

echo "▸ 4/5 Restart aplikacji"
if [[ -n "${RESTART_CMD:-}" ]]; then
  remote "$RESTART_CMD"
else
  # aplikacje Node.js w panelu (Passenger) restartują się po dotknięciu tmp/restart.txt
  remote "mkdir -p $(q "$APP_DIR/tmp") && touch $(q "$APP_DIR/tmp/restart.txt")"
fi

echo "▸ 5/5 Sprawdzenie strony"
if [[ -n "${SITE_URL:-}" ]]; then
  for i in $(seq 1 12); do
    code="$(curl -s -o /dev/null -w '%{http_code}' --max-time 20 "$SITE_URL/" || true)"
    # 401 = strona chroniona hasłem podglądu – też znaczy, że działa
    if [[ "$code" == 200 || "$code" == 401 ]]; then echo "✔ Strona odpowiada ($code): $SITE_URL"; exit 0; fi
    echo "  … odpowiedź $code, czekam ($i/12)"; sleep 10
  done
  echo "✖ Strona nie odpowiada po wdrożeniu – sprawdź logi aplikacji w panelu cyber_Folks"; exit 1
else
  echo "• SITE_URL nie ustawiony – pomijam test"
fi
echo "✔ Wdrożenie zakończone"
