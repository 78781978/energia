# Bezpieczeństwo – Energia w Biznesie / Energia Online

Dokument dla osób wdrażających i utrzymujących serwis. Część 1 opisuje zabezpieczenia wbudowane w aplikację, część 2 to lista kontrolna przed uruchomieniem, część 3 – utrzymanie.

## 1. Zabezpieczenia w aplikacji

| Zagrożenie | Zabezpieczenie | Gdzie w kodzie |
|---|---|---|
| **Wstrzykiwanie SQL** | Wszystkie zapytania przez Prisma z parametrami; brak sklejania SQL z danymi użytkownika. Surowe zapytania tylko w `deploy/setup.js` (stałe teksty + parametry `$1`). | `src/lib/db.ts`, akcje w `src/app/actions/` |
| **XSS (wstrzykiwanie skryptów)** | React escapuje dane; Markdown z panelu: surowy HTML jest escapowany, linki `javascript:` blokowane; JSON-LD z `<` zamienionym na `<`; nagłówek **Content-Security-Policy** (skrypty tylko z własnej domeny i Cloudflare Turnstile, brak wtyczek, `form-action 'self'`). | `src/lib/markdown.ts`, `next.config.ts` |
| **CSRF** | Akcje serwera Next.js sprawdzają nagłówek Origin; ciasteczko sesji `SameSite=Lax`. | wbudowane w Next.js |
| **Kradzież sesji** | Ciasteczko `__Host-eo_session`: `HttpOnly`, `Secure`, bez domeny; w bazie tylko skrót SHA-256 tokenu; sesje klientów 14 dni (z „Zapamiętaj mnie”) lub do zamknięcia przeglądarki; **sesje administratorów maks. 12 h**; zmiana hasła wylogowuje inne urządzenia; reset hasła kasuje wszystkie sesje. | `src/lib/auth.ts` |
| **Łamanie haseł** | bcrypt (koszt 12); min. 10 znaków z literą i cyfrą; stały czas odpowiedzi (nie zdradza, czy konto istnieje). | `src/lib/auth.ts`, `src/lib/validators.ts` |
| **Zgadywanie haseł / boty** | Limity prób **zapisywane w bazie** (działają po restarcie i przy wielu procesach): e-mail+IP (8/15 min), IP (30/15 min), **konto niezależnie od IP (25/h)**, kody 2FA (6/10 min), rejestracja, reset hasła, formularze. Pole-pułapka i minimalny czas wypełnienia; Cloudflare Turnstile po dodaniu kluczy. Adres IP odporny na podrobienie nagłówka `X-Forwarded-For` (ostatni wpis proxy albo `CF-Connecting-IP` za Cloudflare). | `rateLimit`, `clientIp` w `src/lib/auth.ts`, `src/lib/captcha.ts` |
| **Przejęcie konta administratora** | **Logowanie dwuetapowe (TOTP) obowiązkowe dla administratorów w produkcji** – bez niego panel, eksporty i dokumenty klientów są zablokowane; nie da się go wyłączyć; kody zapasowe jednorazowe (przechowywane jako skróty); e-mail do administratora o każdym logowaniu; log udanych i nieudanych logowań z IP (Moje konto). | `requireAdmin`, `adminOrNull` w `src/lib/auth.ts`, `src/app/admin/konto/` |
| **Dostęp do cudzych danych** | Każde zapytanie klienta filtrowane po jego `userId`; pliki pobierane tylko przez właściciela lub administratora z 2FA; panel `/admin/` tylko dla roli ADMIN. | `src/app/api/pliki/[id]/route.ts`, strony portalu |
| **Złośliwe pliki** | Typ rozpoznawany po zawartości (PDF, JPG, PNG, XML), a nie po rozszerzeniu; limit 10 MB; losowe nazwy; katalog poza `public`; pobieranie jako załącznik z `nosniff`; uprawnienia plików 640. **Kontrola zawartości każdego pliku przed zapisem i odczytem**: PDF z JavaScriptem, uruchamianiem programów, osadzonymi plikami, Flash/RichMedia, XFA lub wysyłaniem danych jest odrzucany (także gdy jest to ukryte w skompresowanych strumieniach lub zapisane kodami `#xx`); XML z DOCTYPE/ENTITY odrzucany (XXE); test EICAR; **opcjonalnie antywirus ClamAV** (`CLAMAV_HOST`/`CLAMAV_SOCKET`). Odczyt PDF przez pdf.js 6 (bez wykonywania kodu z PDF). | `src/lib/filescan.ts`, `src/lib/storage.ts` |
| **Przekazywanie faktur do CRM (Livespace)** | Livespace pobiera fakturę z linku podpisanego HMAC-SHA256: link otwiera jeden plik i wygasa po 1 godzinie; zmieniony lub przeterminowany link → 403; plik jako załącznik z `nosniff` i `noindex`. Klucze API Livespace tylko w `.env`. | `src/lib/file-links.ts`, `src/app/api/crm-plik/[id]/route.ts`, `src/lib/livespace.ts` |
| **Wstrzykiwanie formuł w Excelu** | Eksporty CSV poprzedzają `=`, `+`, `-`, `@` apostrofem. | trasy eksportu |
| **Podsłuch / downgrade do HTTP** | **HSTS** (2 lata), `upgrade-insecure-requests`; certyfikat SSL na hostingu. | `next.config.ts` |
| **Osadzanie w obcej stronie (clickjacking)** | `X-Frame-Options: SAMEORIGIN`, `frame-ancestors 'self'`. | `next.config.ts` |
| **Wyciek danych przez pamięć podręczną** | Strony `/portal/` i `/admin/`: `Cache-Control: private, no-store`, `noindex`. | `next.config.ts` |
| **Podatne biblioteki** | Paczka na hosting nie zbuduje się przy znanych poważnych podatnościach (`npm audit`); cotygodniowy test bezpieczeństwa w GitHub Actions; Dependabot proponuje aktualizacje. | `.github/` |
| **Utrata danych** | Skrypt `kopia.sh` (baza + pliki, 14 dni), log zmian (kto, kiedy, co). | `deploy/kopia.sh` |
| **RODO** | Osobne zgody z datą i IP, wycofanie zgód, kopia danych (JSON), wniosek o usunięcie konta, potwierdzenie e-mail. | `src/app/portal/(panel)/konto/` |

**Znane ograniczenia (świadome decyzje):**
- CSP dopuszcza skrypty inline (`'unsafe-inline'`), bo strony publiczne są generowane statycznie (szybkość, SEO). Zewnętrzne skrypty są zablokowane.
- Bez podłączonego ClamAV pliki nie są porównywane z bazą sygnatur wirusów – działa wbudowana analiza zawartości (blokuje aktywną zawartość PDF i XML, czyli typowe nośniki ataków w fakturach). Pliki pobierają tylko zalogowane osoby, zawsze jako załącznik. Pracownicy otwierają dokumenty na komputerach z aktualnym antywirusem.
- Kreator informuje, że konto z danym e-mailem już istnieje (wygoda klienta) – ograniczone limitem prób rejestracji.

**Narzędzia:**
- **Panel → Stan bezpieczeństwa** – automatyczny przegląd: HTTPS, Cloudflare, 2FA administratorów, hasło startowe, dane demo, Turnstile, SMTP, klucz zadań, ostatnie przypomnienia i kopia, katalog plików, uprawnienia `.env`, antywirus.
- **`node cloudflare.js twoja-domena.pl`** (w paczce) – konfiguruje Cloudflare (SSL Full strict, HTTPS, TLS 1.2+, Bot Fight Mode, limit żądań, Turnstile) i sprawdza rekordy SPF/DKIM/DMARC. Z `--sprawdz` tylko raportuje.
- **Zadania w tle** – aplikacja sama raz na dobę uruchamia przypomnienia (gdy ustawiono `CRON_SECRET` i `SITE_URL`) i kopię (`AUTO_KOPIA=1`), także gdy cron na hostingu nie działa.

## 2. Lista kontrolna przed uruchomieniem

**Konta i dostęp**
- [ ] Menedżer haseł dla zespołu; każda usługa ma inne, losowe hasło.
- [ ] 2FA włączone w:
  - [ ] GitHub: Settings → Password and authentication → Two-factor authentication,
  - [ ] Cloudflare: My Profile → Authentication → Two-Factor Authentication,
  - [ ] cyber_Folks: panel klienta → ustawienia konta / bezpieczeństwo (logowanie dwuetapowe),
  - [ ] DirectAdmin: Two-Step Authentication (w menu użytkownika),
  - [ ] rejestrator domeny (jeśli inny niż cyber_Folks) – blokada transferu domeny włączona,
  - [ ] skrzynki e-mail zespołu (Google Workspace / Microsoft 365 / webmail).
- [ ] Kody zapasowe 2FA wszystkich usług zapisane w menedżerze haseł.
- [ ] Repozytorium GitHub prywatne, dostęp tylko dla potrzebnych osób.

**Serwer**
- [ ] Baza (MariaDB lub PostgreSQL) z osobnym użytkownikiem i długim hasłem (tylko dla tej aplikacji).
- [ ] Katalog plików klientów (`STORAGE_DIR`) **poza** `public_html`.
- [ ] `.env` uzupełniony, `chmod 600 .env`, `ADMIN_PASSWORD` usunięte po `node setup.js`.
- [ ] `CRON_SECRET` – losowy, min. 32 znaki; zadanie cron z nagłówkiem `Authorization: Bearer`.
- [ ] Kopie: zadanie cron z `kopia.sh` + cotygodniowa kopia poza hosting + **jednorazowy test odtworzenia**.

**Domena i sieć**
- [ ] Certyfikat Let's Encrypt (domena i `www`).
- [ ] Cloudflare: domena dodana, DNS przez Cloudflare (proxy włączone), potem `CF_API_TOKEN="…" node cloudflare.js twoja-domena.pl` (ustawia SSL, HTTPS, WAF, limit żądań, Turnstile); w `.env` `BEHIND_CLOUDFLARE=1`; token usunięty po konfiguracji.
- [ ] Turnstile: klucze w `.env` (`TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY`).
- [ ] HSTS obejmuje subdomeny – upewnij się, że wszystkie subdomeny działają przez HTTPS.
- [ ] Poczta: rekordy SPF, DKIM, DMARC (na start `p=quarantine`).

**Aplikacja**
- [ ] Każdy administrator ma własne konto i włączone 2FA; kody zapasowe w menedżerze haseł.
- [ ] Usunięte dane demo (`klient.demo@example.com`, oferty „(demo)”), jeśli były wgrane.
- [ ] Regulamin, polityka prywatności, zgody i klauzula ofert zatwierdzone przez prawnika; umowy powierzenia danych (hosting, Cloudflare).

**Test końcowy**
- [ ] Panel → **Stan bezpieczeństwa**: brak pozycji „Do naprawy”.
- [ ] `http://` przekierowuje na `https://`; https://www.ssllabs.com/ssltest/ – ocena A lub A+.
- [ ] https://securityheaders.com – ocena A (CSP, HSTS, X-Frame-Options, Referrer-Policy, Permissions-Policy).
- [ ] Po wylogowaniu `/admin/`, `/portal/konto/`, `/api/portal/liczniki/` i link do faktury → logowanie lub „Brak dostępu”.
- [ ] Po 8 błędnych hasłach logowanie jest czasowo zablokowane.
- [ ] Rejestracja klienta → e-mail z linkiem potwierdzającym → wybór oferty → przesłanie umowy.
- [ ] Monitoring dostępności (np. UptimeRobot) i Google Search Console.

## 3. Utrzymanie

- **Co tydzień:** sprawdź wynik testu „Bezpieczeństwo bibliotek” w GitHub Actions i propozycje Dependabota; pobierz kopię poza hosting.
- **Co miesiąc:** wgraj aktualną paczkę (poprawki bibliotek), przejrzyj konta administratorów (usuń nieużywane), przejrzyj „Moje konto → Ostatnie logowania” i log zmian, sprawdź `kopie/kopia.log`.
- **Co kwartał:** test odtworzenia kopii na pustej bazie; przegląd uprawnień w GitHub, Cloudflare i hostingu.
- **Incydent** (podejrzenie włamania): zmień hasła i `CRON_SECRET`, wyloguj wszystkie sesje (`DELETE FROM "Session";`), sprawdź log zmian i logowania; jeśli doszło do wycieku danych osobowych – zgłoszenie do UODO w ciągu 72 godzin.
