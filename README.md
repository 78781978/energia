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

**Portal klienta** (`/portal/`)
- rejestracja (e-mail + hasło, opcjonalnie telefon), logowanie, reset hasła,
- wniosek w 7 krokach wg grafiki procesu: media → lata → model ceny → taryfa i zużycie → faktura PDF → dane firmy i punktów poboru (wiele PPE) → podsumowanie / „zamów rozmowę z doradcą”; walidacja NIP, REGON, kodów pocztowych, PPE,
- pulpit: status bieżącego wniosku, ostatnie dokumenty, komunikaty od doradcy,
- szczegóły wniosku: pasek statusu, oferty do wyboru, podpisanie umowy (pobierz → podpisz → prześlij PDF), dokumenty, punkty poboru, historia,
- dokumenty (umowy, załączniki, historia) i „Moje dane” (firma, kontakt, punkty poboru, konto).

**Panel administratora** (`/admin/`)
- lista wniosków z widokami (wszystkie / aktywne / oczekujące na podpis / aktywowane / odrzucone), filtrami (NIP, nazwa firmy, status, data zgłoszenia) i eksportem CSV,
- karta wniosku: pełne dane, edycja danych firmy i PPE, zmiana statusu z powiadomieniem klienta, historia statusów, **log zmian** (kto, kiedy, co zmienił), notatki wewnętrzne, komunikaty do klienta, upload/pobieranie PDF, widoczność dokumentów dla klienta, przypisywanie ofert,
- klienci (baza kont, firm i PPE), oferty i cenniki PDF, zapytania z formularzy, analityka (źródła wejścia, lejek formularza i miejsca porzucenia), newsletter z eksportem, zespół (konta administratorów).

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
2. Baza: **PostgreSQL**. Skrypt `scripts/paczka-hosting.sh` sam przełącza schemat na PostgreSQL, generuje `init.sql` i składa gotową paczkę (`dist/energia-hosting.zip`) ze skryptami `start.js` i `setup.js`. Szczegóły: [WDROZENIE-CYBERFOLKS.md](./WDROZENIE-CYBERFOLKS.md).
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

Hasła bcrypt, sesje w bazie (httpOnly cookie), limity prób logowania i formularzy, pliki weryfikowane po sygnaturze (PDF/JPG/PNG, do 10 MB) i przechowywane poza katalogiem publicznym, pobieranie tylko dla właściciela lub administratora, ochrona eksportu CSV przed wstrzykiwaniem formuł, nagłówki bezpieczeństwa.

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
