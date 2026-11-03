/**
 * Kreator wniosku – treści i opcje wg tablicy Miro (MIRO_PORTAL_energia_online).
 * Etapy: 0 dane firmy · 1 media · 2 lata · 3 wariant · 4 taryfa i zużycie · 5 faktury · 6 liczniki · 7 finalizacja.
 */
import type { Media, PriceModel } from "./constants";

/** Warianty zakupu dostępne dla wybranych mediów (etap 3). */
export const PRICE_OPTIONS: Record<Media, PriceModel[]> = {
  PRAD: ["STALA", "RDN", "TRANSZE", "INDYWIDUALNA", "OZE", "PPA", "UPPA", "KOMPLEKSOWA", "AUDYT_DYSTRYBUCJI", "PRODUKTY_TECHNICZNE"],
  GAZ: ["STALA", "RDN", "TRANSZE", "INDYWIDUALNA", "AUDYT_DYSTRYBUCJI", "PRODUKTY_TECHNICZNE"],
  PRAD_GAZ: ["STALA", "RDN", "TRANSZE", "INDYWIDUALNA", "OZE", "PPA", "UPPA", "KOMPLEKSOWA", "AUDYT_DYSTRYBUCJI", "ANALIZA_OPTYMALNA"],
};

/** Nazwy wariantów dla prądu i gazu łącznie (wg Miro). */
const LABEL_BOTH: Partial<Record<PriceModel, string>> = {
  STALA: "Gwarancja stałej ceny prądu i gazu",
  RDN: "Ceny giełdowe (energia + gaz)",
  TRANSZE: "Zakup w transzach – model giełdowy",
  INDYWIDUALNA: "Wycena indywidualna – najlepsza strategia zakupu",
  PPA: "PPA – długoterminowa umowa z producentem energii",
  KOMPLEKSOWA: "Umowa kompleksowa (sprzedaż + dystrybucja)",
};
export function priceLabel(m: PriceModel, media: Media | "", base: string): string {
  return (media === "PRAD_GAZ" && LABEL_BOTH[m]) || base;
}

type StepText = { title: string; html: string };

/** Wyjaśnienia etapów – zależne od mediów. Pogrubienia jak w Miro. */
export const STEP_TEXT: Record<"s3" | "s4" | "s5" | "s6", Record<Media, StepText>> = {
  s3: {
    PRAD: {
      title: "Wybierz wariant zakupu energii",
      html: "Różne modele zakupu energii pozwalają <b>dopasować poziom ceny, bezpieczeństwa i elastyczności do Twojej firmy</b>. Możesz wybrać <b>jeden lub kilka wariantów</b>, aby otrzymać porównanie ofert oraz sprawdzić, który model zakupu będzie dla Ciebie najbardziej korzystny. Nie musisz znać wszystkich szczegółów – na podstawie Twojego wyboru przygotujemy <b>dopasowane propozycje umów i analizę kosztów</b>.",
    },
    GAZ: {
      title: "Wybierz wariant zakupu gazu",
      html: "Różne modele zakupu gazu pozwalają <b>dopasować poziom ceny, bezpieczeństwa i elastyczności do Twojej firmy</b>. Możesz wybrać <b>jeden lub kilka wariantów</b>, aby otrzymać porównanie ofert oraz sprawdzić, który model zakupu będzie dla Ciebie najbardziej korzystny. Nie musisz znać wszystkich szczegółów – na podstawie Twojego wyboru przygotujemy <b>dopasowane propozycje umów i analizę kosztów</b>.",
    },
    PRAD_GAZ: {
      title: "Wybierz wariant zakupu prądu i gazu",
      html: "Możemy przygotować dla Ciebie <b>oferty zakupu prądu i gazu w różnych modelach cenowych</b>. Każdy wariant daje inny poziom <b>stabilności ceny, elastyczności oraz potencjalnych oszczędności</b>. Możesz zaznaczyć <b>jedną lub kilka opcji</b>, aby otrzymać porównanie najlepszych dostępnych rozwiązań dla obu mediów. Na podstawie Twojego wyboru przygotujemy <b>dopasowane oferty oraz analizę kosztów</b>.",
    },
  },
  s4: {
    PRAD: {
      title: "Podaj taryfę oraz szacowane roczne zużycie energii",
      html: "Aby przygotować <b>dokładną wycenę oraz dopasowane oferty</b>, potrzebujemy podstawowych informacji o Twoim punkcie poboru energii. Taryfa oraz roczne zużycie pozwolą nam oszacować <b>rzeczywiste koszty oraz dobrać najkorzystniejszy model zakupu energii</b>. Jeśli nie znasz dokładnych danych, możesz podać <b>wartość orientacyjną</b> lub dodać <b>fakturę w kolejnym kroku</b>, a my uzupełnimy brakujące informacje.",
    },
    GAZ: {
      title: "Podaj grupę taryfową oraz szacowane roczne zużycie gazu",
      html: "Aby przygotować dokładną wycenę oraz dopasowane oferty zakupu gazu, potrzebujemy podstawowych informacji o Twoim punkcie poboru. Grupa taryfowa oraz roczne zużycie pozwolą nam oszacować rzeczywiste koszty oraz dobrać najkorzystniejszy model zakupu gazu. Jeśli nie znasz dokładnych danych, możesz podać wartość orientacyjną lub dodać fakturę w kolejnym kroku, a my uzupełnimy brakujące informacje.",
    },
    PRAD_GAZ: {
      title: "Podaj taryfy oraz szacowane roczne zużycie prądu i gazu",
      html: "Aby przygotować dokładną wycenę oraz najlepsze oferty dla prądu i gazu, potrzebujemy podstawowych informacji o Twoich punktach poboru. Taryfy oraz roczne zużycie pozwolą nam oszacować rzeczywiste koszty oraz dobrać najkorzystniejszy model zakupu obu mediów. Jeśli nie znasz dokładnych danych, możesz podać wartości orientacyjne lub dodać faktury w kolejnym kroku, a my uzupełnimy brakujące informacje.",
    },
  },
  s5: {
    PRAD: {
      title: "Dodaj fakturę PDF za prąd",
      html: "Wczytanie faktur za prąd od dotychczasowych dostawców za <b>minimum 3 miesiące</b> pozwoli nam <b>przygotować zamówienie i dopasowaną umowę w naszym portalu</b>. Jeżeli wczytasz faktury za <b>12 miesięcy</b>, wykonamy <b>pełny audyt kosztów energii i dystrybucji</b>, co pozwoli nam <b>dokładnie zdiagnozować przyczyny wysokich rachunków i wzrostu cen energii</b>. Dzięki temu zyskasz <b>pełną kontrolę nad wydatkami i strategię optymalizacji kosztów prądu</b>.",
    },
    GAZ: {
      title: "Dodaj fakturę PDF za gaz",
      html: "Wczytanie faktur za gaz od dotychczasowych dostawców za <b>minimum 3 miesiące</b> pozwoli nam <b>przygotować zamówienie i dopasowaną umowę w naszym portalu</b>. Wczytanie faktur za <b>12 miesięcy</b> umożliwia <b>pełny audyt kosztów gazu i dystrybucji</b>, co pozwoli nam <b>szybko zidentyfikować przyczyny wysokich cen gazu</b> i wskazać sposoby na ich ograniczenie. To krok do <b>optymalizacji wydatków</b> Twojej firmy.",
    },
    PRAD_GAZ: {
      title: "Dodaj faktury PDF za prąd i gaz",
      html: "Wczytanie faktur za prąd i gaz od dotychczasowych dostawców za <b>minimum 3 miesiące</b> pozwoli nam <b>przygotować zamówienie i dopasowaną umowę w naszym portalu</b>, szybciej niż kiedykolwiek wcześniej. Wczytanie faktur za <b>12 miesięcy</b> umożliwia <b>pełny audyt kosztów energii i gazu</b>, co pozwoli nam <b>dokładnie zdiagnozować powody wysokich rachunków i rosnących cen</b>, a także <b>przygotować najlepsze strategie oszczędności</b>.",
    },
  },
  s6: {
    PRAD: {
      title: "Podaj dane liczników, aby przygotować dopasowaną umowę dla Twojej firmy",
      html: "Aby przygotować <b>pełną ofertę dla prądu</b> oraz tańszą umowę, potrzebujemy danych z licznika: numer licznika, numer PPE, adres PPE. Możesz <b>wczytać dane z przekazanej już faktury</b> lub wpisać je ręcznie, albo <b>pominąć ten krok</b> i uzupełnić później. Dzięki temu zyskasz <b>dokładną wycenę, optymalizację kosztów i pełną kontrolę nad rachunkami energii</b>.",
    },
    GAZ: {
      title: "Podaj dane liczników, aby przygotować dopasowaną umowę dla Twojej firmy",
      html: "Aby przygotować ofertę i dopasowaną umowę zakupu gazu, potrzebujemy danych z licznika: numer licznika, numer PPG, adres PPG. Możesz <b>wczytać dane z faktury</b> lub wpisać je ręcznie, albo <b>pominąć ten krok</b> i uzupełnić później.",
    },
    PRAD_GAZ: {
      title: "Podaj dane liczników, aby przygotować dopasowaną umowę dla Twojej firmy",
      html: "Aby przygotować <b>pełną ofertę dla prądu i gazu</b> oraz tańszą umowę, potrzebujemy danych z liczników: numer licznika, numer PPE/PPG, adres PPE/PPG dla obu mediów. Możesz <b>wczytać dane z przekazanych już faktur</b> lub wpisać je ręcznie, albo <b>pominąć ten krok</b> i uzupełnić później. Dzięki temu zyskasz <b>dokładną wycenę, optymalizację kosztów i pełną kontrolę nad rachunkami energii i gazu</b>.",
    },
  },
};

export const STEP7_HTML =
  "Sprawdź podsumowanie swoich wyborów i danych, aby upewnić się, że wszystko jest poprawnie wprowadzone. Po akceptacji regulaminu i wyrażeniu zgód otrzymasz <b>pełny dostęp do naszego portalu</b>, możliwość wygenerowania <b>spersonalizowanej oferty energii i gazu</b> oraz kontakt z naszymi ekspertami.";

export const STEP7_BENEFITS = [
  "pełną kontrolę nad kosztami energii i gazu",
  "szybki dostęp do najlepszych ofert dla Twojej firmy",
  "możliwość konsultacji z ekspertem rynku energii",
  "dostęp do newslettera z informacjami o promocjach i nowościach dla firm",
];

/**
 * Klauzula przy ofertach – TEKST ROBOCZY do zatwierdzenia przez prawnika (zob. BRAKI.md).
 */
export const OFFER_CLAUSE =
  "Przedstawione propozycje mają charakter informacyjny i nie stanowią oferty w rozumieniu art. 66 Kodeksu cywilnego. Ceny zależą od aktualnych cenników sprzedawców i mogą zostać zaktualizowane przez doradcę w ciągu 24 godzin od przygotowania propozycji. Wiążące warunki określa umowa zawarta ze sprzedawcą.";

/** Ile godzin doradca może poprawiać ofertę po jej przygotowaniu. */
export const OFFER_EDIT_HOURS = 24;
