# Energia w Biznesie + portal Energia Online

Serwis doradczy (76 podstron usług w 10 kategoriach) oraz portal klienta i panel administratora – jedna aplikacja Next.js.

> **Czego brakuje do publikacji → [BRAKI.md](./BRAKI.md)**
> **Wdrożenie na cyber_Folks → [WDROZENIE-CYBERFOLKS.md](./WDROZENIE-CYBERFOLKS.md)**

## Co jest w środku

**Strona publiczna** (generowana statycznie – szybka i dobrze indeksowana)
- strona główna, „Jak to działa”, „O nas”, kontakt (rozmowa z doradcą / analiza faktury z załącznikiem / pytanie),
- 10 stron kategorii i 76 podstron usług z treściami z dokumentów `.docx` (H1, lead, treść, CTA, FAQ, meta title/description, adresy URL zgodnie z materiałami),
- SEO: meta tagi, kanoniczne adresy, `sitemap.xml`, `robots.txt`, dane strukturalne Organization, Service, BreadcrumbList, FAQPage, ItemList,
- widżet pomocy z awatarem Iskry, baner cookies (źródło wejścia UTM zapisywane tylko po zgodzie), newsletter.

**Portal klienta** (`/portal/`) – wg tablicy Miro
- **kreator zamówienia `/portal/wniosek/` dostępny bez logowania** (rejestracja na końcu, bez nazw etapów – wg Miro): 1 media → 2 lata → 3 warianty zakupu (wielokrotny wybór, opisy zależne od mediów) → 4 taryfa i zużycie (osobno prąd i gaz) → 5 faktury (osobno prąd i gaz, PDF lub XML z KSeF) → 6 liczniki (**„Wczytaj dane z faktury”** – odczyt PPE/PPG, nr licznika, taryfy, adresu, sprzedawcy i OSD z PDF z tekstem lub XML KSeF; „Wpisz ręcznie”; „Pomiń krok”) → 7 finalizacja rejestracji: podsumowanie, dane firmy i osoby kontaktowej (e-mail = login), hasło, osobne zgody (regulamin+RODO, e-mail, SMS, newsletter), ochrona przed botami → **„Zarejestruj profil i wygeneruj ofertę”**,
- **generator ofert**: po złożeniu zamówienia system dobiera do 3 aktywnych ofert (media, warianty, lata, ważność) i pokazuje je z animacją; doradca może je skorygować przez 24 godziny (klauzula przy ofertach),
- **potwierdzenie e-mail** (link ważny 72 h) – do tego czasu nie można wybrać oferty ani przesłać podpisanej umowy,
- logowanie z opcją **„Zapamiętaj mnie”** (14 dni / sesja przeglądarki), **logowanie dwuetapowe** (aplikacja Authenticator, kod QR, 8 kodów zapasowych), zmiana hasła,
- **pulpit „Witaj w Portalu Klienta Biznesowego”**: kafelki (Generator ofert, Zamówienia, Umowy, Liczniki i umowy, Informacje z rynku, Kontakt z ekspertem), nowe zamówienie (energia, gaz, produkt techniczny, pomoc prawna), przewodnik „Jak zacząć”,
- **Liczniki i umowy**: tabela PPE/PPG (nazwa, adres, status, dostawca, produkt, cena, początek/koniec umowy, oszczędności, priorytet, suma) z eksportem do Excela (CSV) i plikiem kalendarza `.ics`,
- **Ustawienia konta**: dane, logo firmy, hasło, 2FA, zgody i powiadomienia, kalendarz terminów, RODO (kopia danych JSON, wniosek o usunięcie konta),
- szczegóły zamówienia: status, oferty, podpis umowy (pobierz → podpisz → prześlij PDF), dokumenty, liczniki, historia,
- **przypomnienia e-mail** (`/api/cron/przypomnienia/`): niepotwierdzony e-mail, termin wypowiedzenia (30 i 7 dni), wygasająca oferta, umowa czekająca na podpis > 3 dni – każde wysyłane raz.

**Panel administratora** (`/admin/`)
- lista wniosków z widokami (wszystkie / aktywne / oczekujące na podpis / aktywowane / odrzucone), filtrami (NIP, nazwa firmy, status, data zgłoszenia) i eksportem CSV,
- karta wniosku: pełne dane, edycja danych firmy i PPE, dane umów liczników (nowa umowa od–do, wypowiedzenie, oszczędności, priorytet), korekta i zatwierdzanie propozycji z generatora (24 h), zmiana statusu z powiadomieniem klienta, historia statusów, **log zmian** (kto, kiedy, co zmienił), notatki wewnętrzne, komunikaty do klienta, upload/pobieranie PDF, widoczność dokumentów dla klienta, przypisywanie ofert,
- klienci (baza kont, firm i PPE; potwierdzenie e-mail, 2FA, zgody i wnioski RODO), oferty i cenniki PDF, zapytania z formularzy, analityka (źródła wejścia, lejek formularza i miejsca porzucenia), newsletter z eksportem, zespół (konta administratorów).

**Edycja treści (CMS w panelu administratora)**
- **Treści strony** – teksty 10 kategorii i 76 podstron usług: nagłówki, treść (edytor z paskiem narzędzi i podglądem), przyciski, FAQ, meta title/description; „Przywróć oryginał” cofa wszystkie zmiany podstrony,
- **Aktualności** – wpisy na blogu (szkic / publikacja / publikacja zaplanowana), zdjęcie główne, SEO; lista na `/aktualnosci/` i sekcja na stronie głównej,
- **Banery i grafiki** – podmiana obrazu, tekstu alternatywnego i linku, ukrywanie banera,
- **Dane firmy** – nazwa, NIP, KRS, adres, telefon, e-mail, godziny pracy, czas odpowiedzi, LinkedIn/Facebook.
Zmiany są widoczne od razu po zapisaniu (strony odświeżane automatycznie), każda zmiana trafia do logu zmian. Obrazy z panelu zapisują się w `STORAGE_DIR/media` – katalog trzeba objąć kopią zapasową.

Statusy: Wniosek utworzony → W trakcie weryfikacji → Oczekuje na podpis → Podpisana → Wysłana do operatora → Aktywowana (oraz Odrzucona).

## Uruchomienie lokalne

Wymagania: Node.js 20+.

```bash
npm install
```

```bash
cp .env.example .env
```

Uzupełnij w `.env` co najmniej `ADMIN_EMAIL` i `ADMIN_PASSWORD`, a następnie:

```bash
npm run setup
```

```bash
npm run dev
```

Serwis: http://localhost:3000 · panel administratora: zaloguj się na http://localhost:3000/portal/logowanie/ danymi z `.env`.

Dane przykładowe (klient demo, wniosek, oferty):

```bash
npm run db:seed -- --demo
```

Klient demo: `klient.demo@example.com` / `KlientDemo2026`.

## Wdrożenie produkcyjne

1. Ustaw zmienne środowiskowe z `.env.example` (zwłaszcza `SITE_URL`, `DATABASE_URL`, `STORAGE_DIR`, dane SMTP, `NOTIFY_EMAIL`).
2. Baza: **MariaDB 10.6+ / MySQL 8** albo **PostgreSQL**. Skrypt `scripts/paczka-hosting.sh` sam przełącza schemat (dla MariaDB: `BAZA=mariadb`, pola tekstowe jako TEXT/MEDIUMTEXT, utf8mb4), generuje `init.sql` i składa paczkę (`dist/energia-hosting-mariadb.zip` lub `dist/energia-hosting.zip`) ze skryptami `start.js`, `setup.js` i `kopia.sh`. Szczegóły: [WDROZENIE-CYBERFOLKS.md](./WDROZENIE-CYBERFOLKS.md).
3. `STORAGE_DIR` musi wskazywać trwały katalog poza `public/`, objęty kopią zapasową (faktury i umowy klientów). Przy hostingu bez trwałego dysku podmień `src/lib/storage.ts` na zapis do S3 lub podobnej usługi.
4. Uruchom:

```bash
npm ci && npx prisma db push && npm run db:seed && npm run build && npm start
```

Aplikację można hostować na dowolnym serwerze Node.js (VPS, Docker) lub na platformie obsługującej Next.js.

## Treści

- Źródłowe dokumenty: `materialy/tresci/*.docx`, mapa usług: `materialy/mapa-uslug.pdf`, księga znaku: `materialy/ksiega-identyfikacji.pdf`.
- `npm run content:import` (wymaga `pandoc` i Pythona 3) przetwarza `.docx` na `content/services.json` i tworzy raport braków `content/import-report.json`. Komentarze redakcyjne z dokumentów (rekomendacje SEO, uwagi „jak nie powielać treści”) są pomijane.
- Kolejność i nazwy podstron w menu oraz opisy kategorii: `src/lib/content.ts`.
- Dane firmy (telefon, adres, NIP…): `src/lib/site.ts`.
- Przyciski z dokumentów (np. „ZAMÓW UMOWĘ ONLINE”, „UMÓW ROZMOWĘ Z DORADCĄ”) są automatycznie kierowane do portalu albo do formularza kontaktowego z wypełnionym tematem (`src/lib/cta.ts`).

## Zgodność z księgą znaku

Kolory (#FF3026, #C92A22, #232629, #FAF7F0, #62666B), typografia DejaVu Sans (H1 40–48 px, H2 28–32 px, tekst 16–18 px / 150%), siatka odstępów 8/16/24/32/48, pola min. 48 px, przyciski min. 44 px, promienie 12/20 px, grafitowy fokus klawiatury, błędy opisane tekstem, liniowe ikony 24 px / 2 px, Iskra jako awatar pomocy, ilustracje 3D w stanach panelu, ekran logowania wg wzoru. Komunikacja bez gwarancji oszczędności.

## Bezpieczeństwo

Pełny opis zabezpieczeń i lista kontrolna przed startem: **[BEZPIECZENSTWO.md](BEZPIECZENSTWO.md)**.

## Struktura

```
src/app/(site)/        strona publiczna (kategorie i usługi: [slug])
src/app/portal/        logowanie/rejestracja (auth) i panel klienta (panel)
src/app/admin/         panel administratora
src/app/actions/       akcje serwerowe (formularze)
src/lib/               baza, autoryzacja, pliki, e-mail, treści, stałe
prisma/                model danych i seed
scripts/               import treści z .docx
```
