export const APP_STATUSES = [
  "WNIOSEK_UTWORZONY",
  "W_TRAKCIE_WERYFIKACJI",
  "OCZEKUJE_NA_PODPIS",
  "PODPISANA",
  "WYSLANA_DO_OPERATORA",
  "AKTYWOWANA",
  "ODRZUCONA",
] as const;
export type AppStatus = (typeof APP_STATUSES)[number];

export const STATUS_LABEL: Record<AppStatus, string> = {
  WNIOSEK_UTWORZONY: "Wniosek utworzony",
  W_TRAKCIE_WERYFIKACJI: "W trakcie weryfikacji",
  OCZEKUJE_NA_PODPIS: "Oczekuje na podpis",
  PODPISANA: "Podpisana",
  WYSLANA_DO_OPERATORA: "Wysłana do operatora",
  AKTYWOWANA: "Aktywowana",
  ODRZUCONA: "Odrzucona",
};

/** Opis dla klienta – co dzieje się na danym etapie. */
export const STATUS_HELP: Record<AppStatus, string> = {
  WNIOSEK_UTWORZONY: "Otrzymaliśmy Twój wniosek. Doradca rozpocznie weryfikację danych.",
  W_TRAKCIE_WERYFIKACJI: "Analizujemy dane i przygotowujemy oferty dopasowane do Twojej firmy.",
  OCZEKUJE_NA_PODPIS: "Umowa jest gotowa. Pobierz ją, podpisz i prześlij podpisany dokument.",
  PODPISANA: "Dziękujemy. Podpisana umowa trafiła do nas – sprawdzamy dokumenty.",
  WYSLANA_DO_OPERATORA: "Umowa została przekazana do realizacji sprzedawcy i operatorowi.",
  AKTYWOWANA: "Umowa jest aktywna. Dostawy realizowane są na nowych warunkach.",
  ODRZUCONA: "Wniosek został zamknięty. Szczegóły znajdziesz w komunikatach od doradcy.",
};

export const STATUS_TONE: Record<AppStatus, "neutral" | "info" | "warn" | "ok" | "bad"> = {
  WNIOSEK_UTWORZONY: "neutral",
  W_TRAKCIE_WERYFIKACJI: "info",
  OCZEKUJE_NA_PODPIS: "warn",
  PODPISANA: "info",
  WYSLANA_DO_OPERATORA: "info",
  AKTYWOWANA: "ok",
  ODRZUCONA: "bad",
};

/** Widoki listy w panelu administratora */
export const ADMIN_VIEWS: { key: string; label: string; statuses: AppStatus[] | null }[] = [
  { key: "wszystkie", label: "Wszystkie", statuses: null },
  {
    key: "aktywne",
    label: "Aktywne",
    statuses: ["WNIOSEK_UTWORZONY", "W_TRAKCIE_WERYFIKACJI", "PODPISANA", "WYSLANA_DO_OPERATORA"],
  },
  { key: "oczekujace", label: "Oczekujące na podpis", statuses: ["OCZEKUJE_NA_PODPIS"] },
  { key: "aktywowane", label: "Aktywowane", statuses: ["AKTYWOWANA"] },
  { key: "odrzucone", label: "Odrzucone", statuses: ["ODRZUCONA"] },
];

export const MEDIA = { PRAD: "Prąd", GAZ: "Gaz", PRAD_GAZ: "Prąd + gaz" } as const;
export type Media = keyof typeof MEDIA;

export const PRICE_MODELS = {
  STALA: { label: "Gwarancja stałej ceny", help: "Cena sprzedaży ustalona na cały okres umowy." },
  RDN: { label: "Ceny giełdowe RDN", help: "Koszt zakupu powiązany z Rynkiem Dnia Następnego (SPOT)." },
  TRANSZE: { label: "Cena giełdowa – zakup w transzach", help: "Zakup częściami w różnych momentach (np. BASE/PEAK)." },
  INDYWIDUALNA: { label: "Wycena indywidualna", help: "Doradca zaproponuje najlepszą strategię zakupu po analizie danych." },
  OZE: { label: "Zakup energii z gwarancją pochodzenia OZE", help: "Energia z odnawialnych źródeł potwierdzona gwarancjami pochodzenia." },
  PPA: { label: "PPA – umowa z producentem energii", help: "Długoterminowy zakup energii bezpośrednio od wytwórcy OZE." },
  UPPA: { label: "uPPA – wirtualna umowa PPA", help: "Finansowe rozliczenie ceny energii z producentem OZE." },
  KOMPLEKSOWA: { label: "Umowa kompleksowa", help: "Sprzedaż i dystrybucja w jednej umowie." },
  AUDYT_DYSTRYBUCJI: { label: "Audyt kosztów dystrybucji", help: "Sprawdzimy moc umowną, taryfę i opłaty dystrybucyjne." },
  PRODUKTY_TECHNICZNE: { label: "Produkty techniczne", help: "Kompensacja mocy biernej, magazyny energii, serwis i inne." },
  ANALIZA_OPTYMALNA: { label: "Analiza optymalnego zakupu prądu i gazu", help: "Porównamy warianty dla obu mediów i wskażemy najlepszy." },
} as const;
export type PriceModel = keyof typeof PRICE_MODELS;

export const TARIFFS_POWER = ["C11", "C12a", "C12b", "C21", "C22a", "C22b", "B21", "B22", "B23", "G11", "G12", "Inna / nie wiem"];
export const TARIFFS_GAS = ["W-1", "W-2", "W-3", "W-4", "W-5", "W-6", "W-7", "Inna / nie wiem"];

export const USAGE_RANGES = [
  { key: "do50", label: "do 50 MWh", value: 25 },
  { key: "50-200", label: "50–200 MWh", value: 125 },
  { key: "200-500", label: "200–500 MWh", value: 350 },
  { key: "500+", label: "powyżej 500 MWh", value: 750 },
];

export function purchaseYears(now = new Date()): number[] {
  const y = now.getFullYear();
  return [y, y + 1, y + 2, y + 3, y + 4];
}

export const DOC_KINDS = {
  FAKTURA: "Faktura za energię",
  PELNOMOCNICTWO: "Pełnomocnictwo",
  UMOWA: "Umowa do podpisu",
  UMOWA_PODPISANA: "Umowa podpisana",
  OFERTA: "Oferta",
  CENNIK: "Cennik",
  INNE: "Inny dokument",
} as const;
export type DocKind = keyof typeof DOC_KINDS;

export const LEGAL_FORMS = [
  "Jednoosobowa działalność gospodarcza",
  "Spółka cywilna",
  "Spółka jawna",
  "Spółka komandytowa",
  "Spółka z o.o.",
  "Spółka akcyjna",
  "Spółdzielnia",
  "Fundacja / stowarzyszenie",
  "Jednostka samorządu / instytucja publiczna",
  "Inna",
];

export const LEAD_TYPES = {
  KONTAKT: "Kontakt",
  ROZMOWA: "Rozmowa z doradcą",
  ANALIZA: "Analiza faktury",
  PRODUKT_TECHNICZNY: "Produkt techniczny",
  POMOC_PRAWNA: "Pomoc prawna",
} as const;
export const LEAD_STATUSES = { NOWE: "Nowe", W_TOKU: "W toku", ZAMKNIETE: "Zamknięte" } as const;
export const OFFER_ASSIGNMENT_STATUS = { PROPONOWANA: "Proponowana", WYBRANA: "Wybrana przez klienta", ODRZUCONA: "Odrzucona" } as const;

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
export const ALLOWED_UPLOAD_TYPES: Record<string, string> = {
  "application/pdf": "pdf",
  "image/jpeg": "jpg",
  "image/png": "png",
  "application/xml": "xml",
};
