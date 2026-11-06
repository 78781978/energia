# Wdrożenie na hostingu cyber_Folks

Instrukcja uruchomienia serwisu i portalu na hostingu cyber_Folks (panel DirectAdmin, aplikacja Node.js, baza **MariaDB/MySQL** albo **PostgreSQL**).

> Nazwy przycisków w panelu mogą się nieznacznie różnić w zależności od wersji DirectAdmin i pakietu. Jeśli czegoś nie widać, zapytaj pomoc cyber_Folks (czat), czy pakiet ma włączone **aplikacje Node.js**. Bazę wybierz tę, którą daje pakiet – portal działa z obiema.

## 0. Czego potrzebujesz

- pakiet hostingowy cyber_Folks z obsługą **Node.js (wersja 20 lub 22)** oraz bazą **MariaDB 10.6+ / MySQL 8** (standard w DirectAdmin) albo **PostgreSQL**,
- domenę podpiętą do hostingu (np. `energiawbiznesie.pl`),
- skrzynkę e-mail na tej domenie do wysyłki powiadomień (np. `powiadomienia@…`),
- dostęp **SSH** (zalecany; da się też bez niego, opis w kroku 5),
- paczkę dla wybranej bazy: **`energia-hosting-mariadb.zip`** (MariaDB/MySQL) albo **`energia-hosting.zip`** (PostgreSQL). Paczki różnią się tylko sterownikiem bazy – nie da się ich zamienić po wgraniu.

Rozmiar: paczka ok. **71 MB**, po rozpakowaniu ok. **190 MB** (ok. 3100 plików). Zostaw zapas na dokumenty klientów i kopie zapasowe – na start min. **2 GB** wolnego miejsca.

### Skąd wziąć paczkę

- **Najprościej, przez GitHub:** w repozytorium otwórz zakładkę **Actions → „Paczka na hosting” → Run workflow**. Po kilku minutach pobierz plik z sekcji **Artifacts** na dole strony przebiegu (są obie wersje).
- **Albo lokalnie** (Node.js 20+): `npm ci && BAZA=mariadb bash scripts/paczka-hosting.sh` → `dist/energia-hosting-mariadb.zip` (bez `BAZA=mariadb` – wersja PostgreSQL).

Aplikacja jest już zbudowana w paczce. Na serwerze **nie trzeba** uruchamiać `npm install` ani `npm run build`.

## 1. Baza danych

**MariaDB / MySQL** (paczka `energia-hosting-mariadb.zip`): DirectAdmin → **MySQL Management** → **Create new Database**. Panel utworzy bazę i użytkownika (zwykle z prefiksem `LOGIN_`). Zapisz nazwę bazy, użytkownika i hasło; host to zwykle `localhost`, port `3306`. Kodowanie bazy: **utf8mb4** (domyślne – tabele i tak tworzą się w utf8mb4).

```
mysql://UZYTKOWNIK:HASLO@localhost:3306/NAZWA_BAZY
```

**PostgreSQL** (paczka `energia-hosting.zip`): DirectAdmin → **PostgreSQL Management** → utwórz bazę i użytkownika; port zwykle `5432`.

```
postgresql://UZYTKOWNIK:HASLO@localhost:5432/NAZWA_BAZY?schema=public
```

**Liczba połączeń z bazą:** aplikacja używa najwyżej **5 połączeń na proces** (ustawienie `DB_POOL` w `.env`). Hosting zwykle uruchamia 1–2 procesy Node.js, więc łącznie to **5–10 połączeń**, plus 1 na chwilę przy `setup.js` lub kopii zapasowej. Jeśli limit użytkownika bazy w pakiecie (max_user_connections) jest niższy, ustaw `DB_POOL` na mniej, np. `3`. Przy obecnym ruchu wystarczają 2–3 połączenia.

Jeśli hasło zawiera znaki specjalne (`@ : / ? # "`), zakoduj je w adresie (np. `@` → `%40`, `#` → `%23`, `"` → `%22`) albo ustaw hasło z samych liter i cyfr.

## 2. Wgranie plików

1. Utwórz katalog aplikacji **poza** `public_html`, np. `/home/LOGIN/energia`.
2. Wgraj do niego `energia-hosting.zip` (Menedżer plików albo SFTP) i rozpakuj. Zawartość folderu `energia-hosting` (pliki `server.js`, `start.js`, `setup.js`, katalogi `.next`, `public`, `node_modules`) ma się znaleźć bezpośrednio w `/home/LOGIN/energia`.
3. Utwórz katalog na dokumenty klientów, również poza `public_html`: `/home/LOGIN/energia-pliki`.

## 3. Plik `.env`

W katalogu aplikacji skopiuj `.env.example` jako `.env` i uzupełnij:

| Zmienna | Co wpisać |
|---|---|
| `SITE_URL` | adres strony z `https://`, bez ukośnika na końcu |
| `DATABASE_URL` | adres z kroku 1 |
| `STORAGE_DIR` | `/home/LOGIN/energia-pliki` |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | pierwsze konto administratora (hasło min. 10 znaków) |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD` | dane skrzynki z panelu poczty cyber_Folks (port 465 – SSL lub 587 – STARTTLS) |
| `MAIL_FROM` | np. `Energia w Biznesie <powiadomienia@twoja-domena.pl>` |
| `NOTIFY_EMAIL` | adres, na który przychodzą nowe wnioski i zapytania |
| `TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY` | (zalecane) klucze Cloudflare Turnstile – ochrona rejestracji przed botami; darmowe konto na dash.cloudflare.com → Turnstile → Add site (domena) |
| `CRON_SECRET` | długi losowy ciąg (min. 32 znaki) – klucz do przypomnień e-mail (krok 7) |
| `BEHIND_CLOUDFLARE` | `1`, jeśli domena działa przez proxy Cloudflare (pomarańczowa chmurka) – limity prób liczą wtedy prawdziwy IP klienta |
| `ADMIN_2FA_REQUIRED` | zostaw puste – w produkcji logowanie dwuetapowe administratorów jest obowiązkowe |

Po zapisaniu ustaw uprawnienia pliku, aby czytał go tylko właściciel konta: `chmod 600 ~/energia/.env`.

Te same zmienne można zamiast tego wpisać w ustawieniach aplikacji Node.js w panelu (krok 4). Wartości z panelu mają pierwszeństwo przed plikiem `.env`.

## 4. Aplikacja Node.js w panelu

DirectAdmin → **Setup Node.js App** / **Node.js Selector** → **Create application**:

| Pole | Wartość |
|---|---|
| Node.js version | 22 (lub 20) |
| Application mode | Production |
| Application root | `energia` (czyli `/home/LOGIN/energia`) |
| Application URL | Twoja domena (główny adres, bez podkatalogu) |
| Application startup file | `start.js` |

Zapisz. **Nie klikaj „Run NPM Install”** – zależności są już w paczce.

## 5. Utworzenie tabel i konta administratora (jednorazowo)

**Przez SSH:** wejdź do katalogu aplikacji i uruchom skrypt środowiskiem aplikacji. Panel pokazuje gotowe polecenie „Enter to the virtual environment”, a ścieżka może się różnić:

```bash
cd ~/energia && node setup.js
```

Wynik powinien zawierać „Utworzono tabele” i „Utworzono administratora”.

**Bez SSH:** w ustawieniach aplikacji Node.js w panelu użyj opcji **Run JS script** (jeśli jest dostępna) i wskaż `setup.js`. Możesz też poprosić pomoc cyber_Folks o jednorazowe uruchomienie `node setup.js` w katalogu aplikacji.

Następnie usuń `ADMIN_PASSWORD` z `.env` i **zrestartuj aplikację** (przycisk Restart w panelu).

**Pierwsze logowanie administratora:** po zalogowaniu panel od razu poprosi o włączenie logowania dwuetapowego (kod QR do aplikacji Google/Microsoft Authenticator). Zapisz 8 kodów zapasowych w menedżerze haseł. Bez 2FA panel administratora jest zablokowany. Tak samo każdy nowy członek zespołu dodany w zakładce „Zespół”.

## 6. SSL i sprawdzenie

1. DirectAdmin → **SSL Certificates** → Let's Encrypt dla domeny (i `www`).
2. Otwórz stronę: powinna się wyświetlić strona główna.
3. Zaloguj się: `https://twoja-domena.pl/portal/logowanie/` danymi administratora. Trafisz do panelu `/admin/`.
4. Testowo załóż konto klienta i wyślij wniosek z fakturą PDF. Sprawdź, czy wniosek widać w panelu i czy przyszły e-maile.
5. Zgłoś mapę strony w Google Search Console: `https://twoja-domena.pl/sitemap.xml`.

## 7. Przypomnienia e-mail (harmonogram zadań)

Portal wysyła przypomnienia (niepotwierdzony e-mail, termin wypowiedzenia umowy, wygasająca oferta, umowa czekająca na podpis). Uruchamia je raz dziennie harmonogram zadań:

DirectAdmin → **Advanced Features → Cron Jobs** (Zadania cron) → dodaj zadanie: minuta `15`, godzina `7`, pozostałe pola `*`, polecenie:

```bash
curl -fsS -H "Authorization: Bearer TWOJ_CRON_SECRET" https://twoja-domena.pl/api/cron/przypomnienia/ > /dev/null
```

(Klucz w nagłówku, a nie w adresie – nie trafia wtedy do logów serwera.)

**Ceny energii (opcjonalnie):** aplikacja sama co godzinę pobiera ceny rynkowe RCE z PSE (panel → **Ceny energii**, widoczne tylko dla administratorów). Jeśli hosting usypia aplikację, dodaj zadanie cron co godzinę (minuta `20`, godzina `*`):

```bash
curl -fsS -H "Authorization: Bearer TWOJ_CRON_SECRET" https://twoja-domena.pl/api/cron/ceny/ > /dev/null
```

## 8. Kopie zapasowe (harmonogram zadań)

W paczce jest skrypt `kopia.sh`: zapisuje bazę (`mariadb-dump` dla MariaDB/MySQL, `pg_dump` dla PostgreSQL) i katalog plików klientów do `~/kopie`, usuwa kopie starsze niż 14 dni. Dodaj drugie zadanie cron (codziennie, np. 2:30):

```bash
bash /home/LOGIN/energia/kopia.sh >> /home/LOGIN/kopie/kopia.log 2>&1
```

Jeśli w `.env` jest `AUTO_KOPIA=1`, aplikacja sama robi kopię raz na dobę – zadanie cron jest wtedy zabezpieczeniem na wypadek uśpienia aplikacji. Stan ostatniej kopii widać w panelu: **Stan bezpieczeństwa**.

Raz w tygodniu pobierz najnowsze pliki z `~/kopie` poza hosting (np. na dysk w chmurze). Odtworzenie bazy: MariaDB – `gunzip < baza_DATA.sql.gz | mariadb -u UZYTKOWNIK -p NAZWA_BAZY`; PostgreSQL – `pg_restore --clean --no-owner -d "ADRES_BAZY" baza_DATA.dump`. Przed startem raz przetestuj odtworzenie na pustej bazie.

Każde przypomnienie jest wysyłane tylko raz, więc ponowne uruchomienie niczego nie dubluje.

## 9. Cloudflare (automatycznie)

1. Załóż konto na cloudflare.com, dodaj domenę (plan Free) i u rejestratora zmień serwery DNS na podane przez Cloudflare. Rekordy A domeny i `www` mają mieć włączone proxy (pomarańczowa chmurka).
2. Utwórz token API (My Profile → API Tokens → Create Token → Custom token; uprawnienia opisane na początku pliku `cloudflare.js`; zakres tylko ta domena).
3. Na serwerze lub swoim komputerze:

```bash
CF_API_TOKEN="TWOJ_TOKEN" node cloudflare.js twoja-domena.pl
```

4. Skrypt wypisze klucze Turnstile – wpisz je do `.env`, dodaj `BEHIND_CLOUDFLARE=1`, zrestartuj aplikację.
5. Usuń token API w Cloudflare. Sprawdź panel → **Stan bezpieczeństwa**.

## 10. Automatyczne wdrażanie z GitHuba

Po jednorazowej konfiguracji każda zmiana wysłana na GitHub (na wybraną gałąź) sama trafia na serwer: GitHub buduje paczkę, robi kopię zapasową na serwerze, wgrywa pliki (bez `.env`, dokumentów klientów i kopii), uruchamia `node setup.js`, restartuje aplikację i sprawdza, czy strona odpowiada. Postęp widać w zakładce **Actions → „Wdrożenie na cyber_Folks”**; o nieudanym wdrożeniu GitHub wyśle e-mail.

Warunek: pierwsze wdrożenie (kroki 1–6, w tym plik `.env`) musi być już zrobione, a pakiet musi mieć **dostęp SSH**.

**1. Klucz SSH tylko dla GitHuba** – na swoim komputerze (Windows: PowerShell, Mac: Terminal):

```bash
ssh-keygen -t ed25519 -C github-deploy -f deploy_key -N ""
```

Powstaną dwa pliki: `deploy_key` (prywatny – trafi do GitHuba) i `deploy_key.pub` (publiczny – trafi na serwer).

**2. Klucz publiczny na serwerze:** DirectAdmin → **SSH Keys** → **Paste key** → wklej zawartość `deploy_key.pub` → zapisz. (Bez tej opcji w panelu: dopisz linię do pliku `~/.ssh/authorized_keys` przez Menedżer plików.)

**3. Odcisk serwera** (chroni przed podszyciem się pod serwer) – na komputerze:

```bash
ssh-keyscan -p PORT_SSH ADRES_SERWERA
```

Adres serwera i port SSH znajdziesz w panelu cyber_Folks (dane do SSH). Skopiuj cały wynik.

**4. Ścieżka do Node.js:** w **Setup Node.js App** przy aplikacji jest polecenie „Enter to the virtual environment”, np. `source /home/LOGIN/nodevenv/energia/22/bin/activate && cd /home/LOGIN/energia`. Zapisz ścieżkę do pliku `activate`.

**5. Sekrety w GitHubie:** repozytorium → **Settings → Secrets and variables → Actions → New repository secret**:

| Sekret | Wartość |
|---|---|
| `CYBERFOLKS_SSH_HOST` | adres serwera SSH |
| `CYBERFOLKS_SSH_PORT` | port SSH (jeśli inny niż 22) |
| `CYBERFOLKS_SSH_USER` | login hostingu |
| `CYBERFOLKS_SSH_KEY` | **cała** zawartość pliku `deploy_key` (razem z liniami BEGIN/END) |
| `CYBERFOLKS_KNOWN_HOSTS` | wynik polecenia z punktu 3 |

Zakładka **Variables** w tym samym miejscu → **New repository variable**:

| Zmienna | Wartość |
|---|---|
| `CYBERFOLKS_APP_DIR` | katalog aplikacji, np. `/home/LOGIN/energia` |
| `CYBERFOLKS_NODE_ACTIVATE` | ścieżka z punktu 4, np. `/home/LOGIN/nodevenv/energia/22/bin/activate` |
| `SITE_URL` | adres strony, np. `https://twoja-domena.pl` |
| `BAZA` | `mariadb` (albo `postgresql`) |
| `WDROZENIE_GALAZ` | gałąź, z której wdrażać, np. `vie/brave-volta-d9clby` |
| `WDROZENIE_WLACZONE` | `1` – włącza automat (`0` – wyłącza) |

Po zapisaniu sekretu usuń plik `deploy_key` z komputera (albo przenieś do menedżera haseł).

**6. (Zalecane) Zatwierdzanie wdrożeń:** **Settings → Environments → produkcja → Required reviewers** → dodaj siebie. Każde wdrożenie poczeka wtedy na Twoje kliknięcie „Approve” w GitHubie.

**7. Test:** **Actions → „Wdrożenie na cyber_Folks” → Run workflow**. Po kilku minutach wszystkie kroki powinny być zielone, a ostatni wypisze „Strona odpowiada”.

Restart: skrypt dotyka pliku `tmp/restart.txt` w katalogu aplikacji (tak restartują się aplikacje Node.js w panelu). Jeśli na Twoim pakiecie restart działa inaczej, ustaw zmienną `RESTART_CMD` w kroku „Wdrożenie” pliku `.github/workflows/wdrozenie-cyberfolks.yml`. Ręcznie, bez GitHuba, ten sam skrypt uruchomisz poleceniem `bash scripts/wdroz-cyberfolks.sh` (opis zmiennych na początku pliku).

## Aktualizacja do nowej wersji

Z automatem z kroku 10 nic nie trzeba robić – wystarczy wysłać zmiany na GitHub. Ręcznie:

1. Pobierz nową paczkę (krok 0).
2. W katalogu aplikacji podmień wszystko **oprócz** pliku `.env` (katalog `energia-pliki` leży osobno i zostaje nietknięty).
3. Jeśli opis zmian mówi o zmianie bazy, uruchom `node setup.js` – skrypt dodaje brakujące tabele i kolumny (istniejące dane zostają).
4. Zrestartuj aplikację w panelu.

## Kopie zapasowe

Regularnie kopiuj **bazę PostgreSQL** (kopie w panelu cyber_Folks) oraz katalog **`/home/LOGIN/energia-pliki`**. Są w nim faktury i umowy klientów. Sprawdź, czy kopia hostingu obejmuje katalogi spoza `public_html`.

## Rozwiązywanie problemów

| Objaw | Co sprawdzić |
|---|---|
| Błąd 503 / aplikacja nie startuje | log aplikacji w panelu Node.js (lub `stderr.log` w katalogu aplikacji); poprawność `DATABASE_URL`; wersja Node.js ≥ 20 |
| „PrismaClientInitializationError … query engine” | system serwera nie pasuje do dołączonych silników bazy – przekaż komunikat, dodamy właściwy wariant do paczki |
| Strona działa, ale nie przychodzą e-maile | dane SMTP w `.env`, port 465/587; bez `SMTP_HOST` wiadomości trafiają tylko do logu |
| Nie da się wgrać większej faktury | limit wielkości żądań na serwerze – poproś pomoc cyber_Folks o zwiększenie do min. 26 MB |
| Zmiany w `.env` nie działają | po każdej zmianie zrestartuj aplikację w panelu |
