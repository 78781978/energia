# Tymczasowy podgląd na Vercel

Do pokazania strony i portalu innym osobom przed wdrożeniem na cyber_Folks. **To nie jest wersja produkcyjna** – patrz „Ograniczenia”.

## 1. Projekt i baza

1. Zaloguj się na https://vercel.com (najprościej kontem GitHub) i włącz 2FA w ustawieniach konta.
2. **Add New → Project** → wybierz repozytorium `energia` → **Import**.
   - Framework: Next.js (wykryje sam), pozostałe ustawienia bez zmian (skrypt `vercel-build` robi resztę).
3. Zanim klikniesz Deploy – albo zaraz po pierwszym (nieudanym) wdrożeniu – dodaj bazę:
   projekt → **Storage → Create Database → Neon (Postgres)** → plan Free → połącz z projektem.
   Vercel sam doda zmienne `DATABASE_URL` i `DATABASE_URL_UNPOOLED`.
4. Gałąź: projekt → **Settings → Git → Production Branch** → `vie/brave-volta-d9clby` (albo gałąź, na której jest kod).

## 2. Zmienne środowiskowe

Projekt → **Settings → Environment Variables** (środowisko: Production i Preview):

| Zmienna | Wartość |
|---|---|
| `PREVIEW_USER` | login do podglądu, np. `podglad` |
| `PREVIEW_PASSWORD` | długie hasło – przekażesz je osobom, które mają oglądać stronę |
| `SITE_NOINDEX` | `1` – Google nie zaindeksuje wersji tymczasowej |
| `SITE_URL` | adres z Vercela, np. `https://energia-xxx.vercel.app` |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | konto administratora (hasło min. 10 znaków) |
| `SEED_DEMO` | `1` – przykładowy klient, zamówienie i oferty do prezentacji (`klient.demo@example.com` / `KlientDemo2026`) |
| `SMTP_*`, `MAIL_FROM`, `NOTIFY_EMAIL` | opcjonalnie – bez nich e-maile (np. link potwierdzający) widać tylko w logach: projekt → **Logs** |

Po dodaniu zmiennych: **Deployments → … → Redeploy**.

## 3. Pierwsze wejście

1. Otwórz adres z Vercela – przeglądarka zapyta o `PREVIEW_USER` / `PREVIEW_PASSWORD`.
2. Panel: `/portal/logowanie/` → dane administratora → panel poprosi o włączenie logowania dwuetapowego (obowiązkowe).
3. Po prezentacji usuń z ustawień `ADMIN_PASSWORD` (konto już istnieje).

## Ograniczenia podglądu

- **Pliki klientów i obrazy z panelu są tymczasowe** (zapisywane w `/tmp`) – znikają po kilku minutach bezczynności. Nie przyjmuj tu prawdziwych faktur ani umów.
- **Pliki do ok. 4,5 MB** – Vercel ogranicza rozmiar przesyłanych danych (na cyber_Folks: 10 MB).
- Brak zadań w tle (przypomnienia, kopie) – na Vercelu nie działają.
- Plan **Hobby** jest przeznaczony do użytku niekomercyjnego; do dłuższego podglądu dla firmy właściwy jest plan Pro (ma też wbudowaną ochronę hasłem).
- Dane osobowe: nie wpisuj prawdziwych danych klientów – baza i podgląd służą tylko do prezentacji.

Usunięcie podglądu: projekt → **Settings → General → Delete Project** oraz baza Neon w **Storage**.
