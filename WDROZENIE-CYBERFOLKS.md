# Wdrożenie na hostingu cyber_Folks

Instrukcja uruchomienia serwisu i portalu na hostingu cyber_Folks (panel DirectAdmin, aplikacja Node.js, baza PostgreSQL).

> Nazwy przycisków w panelu mogą się nieznacznie różnić w zależności od wersji DirectAdmin i pakietu. Jeśli czegoś nie widać, zapytaj pomoc cyber_Folks (czat), czy pakiet ma włączone **aplikacje Node.js** i **bazy PostgreSQL**. Tego wymaga portal.

## 0. Czego potrzebujesz

- pakiet hostingowy cyber_Folks z obsługą **Node.js (wersja 20 lub 22)** i **PostgreSQL**,
- domenę podpiętą do hostingu (np. `energiawbiznesie.pl`),
- skrzynkę e-mail na tej domenie do wysyłki powiadomień (np. `powiadomienia@…`),
- dostęp **SSH** (zalecany; da się też bez niego, opis w kroku 5),
- plik `energia-hosting.zip`.

### Skąd wziąć `energia-hosting.zip`

- **Najprościej, przez GitHub:** w repozytorium otwórz zakładkę **Actions → „Paczka na hosting” → Run workflow**. Po kilku minutach pobierz plik z sekcji **Artifacts** na dole strony przebiegu.
- **Albo lokalnie** (Node.js 20+): `npm ci && bash scripts/paczka-hosting.sh` → `dist/energia-hosting.zip`.

Aplikacja jest już zbudowana w paczce. Na serwerze **nie trzeba** uruchamiać `npm install` ani `npm run build`.

## 1. Baza danych PostgreSQL

DirectAdmin → **Bazy danych PostgreSQL** (PostgreSQL Management) → utwórz bazę i użytkownika. Zapisz:
- nazwę bazy, nazwę użytkownika, hasło,
- host (zwykle `localhost`) i port (zwykle `5432`).

Adres połączenia ma postać:
```
postgresql://UZYTKOWNIK:HASLO@localhost:5432/NAZWA_BAZY?schema=public
```
Jeśli hasło zawiera znaki specjalne (`@ : / ? #`), zakoduj je (np. `@` → `%40`) albo ustaw hasło z samych liter i cyfr.

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
curl -fsS "https://twoja-domena.pl/api/cron/przypomnienia/?klucz=TWOJ_CRON_SECRET" > /dev/null
```

Każde przypomnienie jest wysyłane tylko raz, więc ponowne uruchomienie niczego nie dubluje.

## Aktualizacja do nowej wersji

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
