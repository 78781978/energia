# Co trzeba dostarczyć / zdecydować

Lista rzeczy, których brakuje w przesłanych materiałach albo które wymagają decyzji. Strona i portal działają bez nich, ale przed publikacją trzeba je uzupełnić.

## A. Pilne – przed publikacją

| # | Czego brakuje | Gdzie się to pojawi | Co teraz jest w serwisie |
|---|---|---|---|
| 1 | **Dane firmy** – ✅ uzupełnione z regulaminu i polityki prywatności (nazwa, adres, NIP, REGON, telefon, e-mail, godziny 8–16, Facebook); brak tylko profilu LinkedIn | stopka, kontakt, dane strukturalne Google | zmiana w panelu: **Dane firmy** |
| 2 | **Polityka prywatności i regulamin portalu** – ✅ treść z dokumentów klienta, regulamin zatwierdzony (wersja z 5.11.2026) | `/polityka-prywatnosci/`, `/regulamin/` | treść w `src/content/prawne.ts` |
| 3 | **Odpowiedzi do FAQ w kategorii 1** (prąd i gaz dla firm) – w plikach .docx skopiowały się same pytania, bez odpowiedzi (98 pytań na 7 podstronach) | FAQ na podstronach kategorii 1 | na każdej z 7 podstron widoczne są 3 pytania z odpowiedziami; brakujące pytania (lista: `content/import-report.json`) można dopisać samodzielnie w panelu: **Treści strony → podstrona → Dodaj pytanie** |
| 4 | **Konto pocztowe SMTP** – ✅ skrzynka biuro@energiawbiznesie.online (dane wpisuje się w `.env` na serwerze) | e-maile: rejestracja, potwierdzenie wniosku, zmiany statusów, reset hasła, zapytania | bez SMTP wiadomości trafiają tylko do logu serwera |
| 5 | **Hosting i domena** – ✅ cyber_Folks (Node.js + MariaDB), domena energiawbiznesie.online | – | lokalnie działa SQLite + katalog `storage/` |
| 6 | **„Odpowiadamy w ciągu jednego dnia roboczego”** – ✅ potwierdzone przez klienta | formularze kontaktowe, e-mail do klienta | tekst jest użyty – zmień, jeśli SLA jest inne |

| 6a | **Klucze Cloudflare Turnstile** (darmowe) dla domeny | captcha przy rejestracji w kreatorze | bez kluczy działa pole-pułapka i minimalny czas wypełnienia |
| 6b | ✅ **Zaakceptowane: klauzula przy ofertach** („propozycje mają charakter informacyjny… mogą zostać zaktualizowane w ciągu 24 godzin…”) i treści zgód (e-mail, SMS, newsletter) | karta ofert, etap 7 kreatora, ustawienia konta | teksty robocze w `src/lib/wizard.ts` i `src/app/portal/wniosek/Wizard.tsx` |
| 6c | **Harmonogram zadań (cron) i `CRON_SECRET`** na hostingu | przypomnienia e-mail | instrukcja: `WDROZENIE-CYBERFOLKS.md`, krok 7 |
| 6d | **Przykładowe faktury różnych sprzedawców** (PDF i XML z KSeF, prąd i gaz) do dostrojenia odczytu | „Wczytaj dane z faktury” w kreatorze | odczyt działa dla PDF z warstwą tekstową i XML KSeF; skany wymagają OCR (etap C) |

## B. Grafika i identyfikacja

| # | Czego brakuje | Dlaczego |
|---|---|---|
| 7 | **Logo w wektorach (SVG/PDF)** w wersjach: Energia w Biznesie, Energia Online, sam symbol, wersja biała | Księga sama wskazuje, że logo jest koncepcją rastrową. Teraz logo jest wycięte z PDF i oczyszczone do PNG – wygląda dobrze, ale wektor będzie ostrzejszy. |
| 8 | (Ilustracje 7 kroków procesu – ✅ zastąpione własnymi ilustracjami wektorowymi SVG, bez postaci) **Ilustracje w wysokiej rozdzielczości jako osobne pliki** (PNG z przezroczystością lub SVG): 10 ilustracji kategorii, 7 ilustracji kroków procesu, Iskra i ilustracje 3D | Teraz są wycięte z zestawień – ilustracje kategorii mają ok. 140 px szerokości, więc na ekranach Retina są lekko miękkie. |
| 9 | **Banery bez tekstu** (same grafiki: reflektor, droga z figurkami, „e” z samolotem, parasole, karty produktów) w rozdzielczości min. 2000 px | Na stronie używamy prawej części banerów; tekst jest dodany w HTML (lepsze SEO i dostępność). |
| 10 | ✅ **Zdjęcie doradcy** – portret Basi z odręcznymi notatkami na stronie O nas (numer komórkowy na zdjęciu zaakceptowany) | – |
| 11 | Ewentualny **licencjonowany font marki** | Księga wskazuje DejaVu Sans jako font wdrożeniowy – tak jest wdrożone. |

## C. Decyzje biznesowe (ze specyfikacji MVP)

| # | Pytanie | Co jest wdrożone teraz |
|---|---|---|
| 12 | **Sposób podpisu umowy**: (1) pobierz–podpisz–odeślij, (2) upload podpisanego PDF, (3) integracja z podpisem elektronicznym (Autenti, SimplySign, Certum) | Opcja 1+2: klient pobiera umowę, podpisuje (kwalifikowany / zaufany / skan) i wgrywa PDF; status zmienia się na „Podpisana”, zespół dostaje powiadomienie. Integracja z dostawcą e-podpisu to osobny etap (koszt abonamentu + prace). |
| 13 | **Wiele punktów poboru** | Firma może mieć dowolną liczbę PPE; we wniosku można dodawać kolejne punkty; administrator może dołączać punkty do wniosku. |
| 14 | **Czy każdy punkt ma osobną umowę?** | Umowy są dokumentami wniosku – można wgrać kilka (np. po jednej na PPE). Jeśli potrzebne jest śledzenie statusu osobno dla każdego PPE, to rozszerzenie. |
| 15 | **Rola prawna portalu** (pośrednik / agent sprzedawcy) i moment zawarcia umowy | Teksty mówią: „Wysłanie wniosku nie oznacza zawarcia umowy. Finalizacja zależy od procedur sprzedawcy.” – do potwierdzenia przez prawnika. |
| 16 | **Nazewnictwo**: treści z .docx nazywają portal „Energia w Biznesie”, a księga znaku rozdziela: Energia Online = portal, Energia w Biznesie = doradztwo | Strona doradcza używa logo Energia w Biznesie, portal i panel – Energia Online. Teksty z dokumentów pozostawiono bez zmian. |
| 17 | ✅ **Teksty stron nadrzędnych kategorii 1 i 2** – zaakceptowane przez klienta | `src/lib/content.ts` |
| 18 | **Realne oferty i cenniki sprzedawców** | Administrator dodaje je w panelu „Oferty i cenniki”; dane demo są tylko w trybie `--demo`. |

## D. Kolejne etapy (zgodnie ze specyfikacją – nie wchodzą w MVP)

- **Asystent AI (czat)** z przejęciem rozmowy przez konsultanta, umawianiem spotkań i telefonem – w serwisie jest już widżet z awatarem Iskry (przekierowuje do formularzy); do decyzji: dostawca modelu AI, godziny pracy konsultantów, narzędzie do kalendarza.
- **OCR skanów faktur** – odczyt z PDF z tekstem i XML KSeF już działa; skany/zdjęcia wymagają usługi OCR.
- **Reguły generatora cenników** (marże, progi zużycia, automatyczne ceny wg taryfy) – teraz generator dobiera oferty wprowadzone w panelu; potrzebne zasady wyceny.
- **Dane rynkowe** (ENTSO-E, TGE) w „Informacjach z rynku” – teraz kafelek prowadzi do Aktualności; potrzebny dostęp do API/licencja danych TGE.
- **SMS** – zgoda SMS jest zbierana; do wyboru bramka SMS (np. SMSAPI) i treści powiadomień.
- **Strony regionalne / mapa** – potrzebna lista miast i treści.
- **Newsletter – automatyzacje**: zapis i eksport CSV działają; do wyboru narzędzie wysyłkowe (np. Klaviyo, HubSpot) i integracja.
- **Analityka zewnętrzna**: wbudowana analityka (źródła UTM, lejek i miejsca porzucenia formularza) działa; do decyzji GA4/Tag Manager + Google Search Console.
- **SEO lokalne**: landing pages dla miast, case studies, artykuły poradnikowe – potrzebna lista lokalizacji i treści.
