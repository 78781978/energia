/**
 * Akademia Energia Online – pakiety szkoleń (ceny brutto).
 * Ceny zmienia się w tym pliku. Prowizji partnerów nie publikujemy – ustalane indywidualnie w umowie partnerskiej.
 */
export type TrainingPackage = {
  id: string;
  tier: string;
  name: string;
  meta: string;
  price: string;
  per: string;
  desc: string;
  recommended?: boolean;
};

/** Dopisek przy cenach, np. „Ceny brutto (zawierają VAT)”. Pusty = brak dopisku. */
export const PRICE_NOTE = "Ceny brutto (zawierają VAT). Każdy uczestnik otrzymuje certyfikat ukończenia szkolenia.";

export const TRAINING_PACKAGES: TrainingPackage[] = [
  {
    id: "start",
    tier: "Pakiet START",
    name: "Podstawy doradztwa energetycznego",
    meta: "2 dni • Online",
    price: "690 zł",
    per: "brutto za osobę",
    desc: "Dla osób, które chcą poznać branżę, nauczyć się czytać faktury i zrozumieć zasady sprzedaży energii oraz gazu.",
  },
  {
    id: "profesjonalny",
    tier: "Pakiet PROFESJONALNY",
    name: "Zostań doradcą energetycznym",
    meta: "5 dni • Online na żywo",
    price: "1 490 zł",
    per: "brutto za osobę",
    desc: "Kompleksowe szkolenie z analizy faktur, ofert energetycznych, obsługi klientów, procesu zmiany sprzedawcy i pozyskiwania klientów biznesowych.",
    recommended: true,
  },
  {
    id: "premium",
    tier: "Pakiet PREMIUM",
    name: "Doradca energetyczny PRO",
    meta: "5 dni + 30 dni mentoringu",
    price: "2 490 zł",
    per: "brutto za osobę",
    desc: "Szkolenie profesjonalne, indywidualne konsultacje, analiza rzeczywistych przypadków i wsparcie podczas pierwszych działań z klientami.",
  },
  {
    id: "partnerski",
    tier: "Pakiet PARTNERSKI",
    name: "Energia dla księgowych i elektryków",
    meta: "1 dzień • Online",
    price: "390 zł",
    per: "brutto za osobę",
    desc: "Jak rozpoznawać potrzeby energetyczne klientów, polecać audyty i przekazywać kontakty do zespołu specjalistów.",
  },
];

export const PARTNER_TRAINING = {
  name: "Szkolenie partnera polecającego",
  who: "Księgowi, elektrycy, biura rachunkowe",
  price: "0 zł",
  desc: "Bezpłatne szkolenie wprowadzające dla zaakceptowanych partnerów, którzy podpiszą umowę współpracy. Partner poznaje ofertę audytów energetycznych, zasady polecania klientów i sposób naliczania wynagrodzenia.",
};

export const TRAINING_OPTIONS = [...TRAINING_PACKAGES.map((p) => `${p.tier} – ${p.name} (${p.price})`), "Jeszcze nie wiem – proszę o kontakt"];
