import data from "@content/services.json";
import type { IconName } from "@/components/Icon";

export type Faq = { q: string; a: string };
export type ServicePage = {
  category: number;
  name: string;
  slug: string;
  h1: string;
  lead: string | null;
  body: string;
  tagline: string | null;
  ctas: string[];
  faq: Faq[];
  metaTitle: string | null;
  metaDescription: string | null;
  keywords: string[];
};
type Parent = {
  h1: string | null;
  lead: string | null;
  body: string;
  ctas: string[];
  metaTitle: string | null;
  metaDescription: string | null;
};
type Module = { title: string | null; body: string; ctas: string[] };

export type Category = {
  id: number;
  slug: string;
  name: string;
  short: string;
  icon: IconName;
  image: string;
  /** Kolejność i nazwy podstron w menu – zgodnie z mapą usług (mapa-uslug.pdf) */
  services: { slug: string; name: string }[];
  parent: Parent;
  module: Module | null;
};

const raw = data as unknown as {
  pages: ServicePage[];
  parents: Record<string, Parent>;
  modules: Record<string, Module>;
};

type CatDef = Omit<Category, "parent" | "module"> & { parentFallback?: Parent };

const DEFS: CatDef[] = [
  {
    id: 1,
    slug: "energia-elektryczna-i-gaz-dla-firm",
    name: "Energia elektryczna i gaz dla firm",
    short: "Porównaj oferty prądu i gazu, wybierz model ceny i zamów umowę online.",
    icon: "bolt",
    image: "/img/kategorie/energia.jpg",
    services: [
      { slug: "prad-dla-firm-stala-cena", name: "Prąd dla firm – stała cena" },
      { slug: "energia-gieldowa-base-peak-dla-firm", name: "Energia elektryczna – ceny giełdowe BASE/PEAK" },
      { slug: "energia-spot-dla-firm", name: "Energia elektryczna SPOT – Rynek Dnia Następnego" },
      { slug: "taryfy-dynamiczne-energii-dla-firm", name: "Taryfy dynamiczne energii elektrycznej" },
      { slug: "gaz-dla-firm-zmiana-sprzedawcy", name: "Gaz ziemny dla firm – zakup i zmiana sprzedawcy" },
      { slug: "grupy-zakupowe-energii-i-gazu", name: "Grupy zakupowe energii elektrycznej i gazu" },
      { slug: "przetargi-na-energie-i-gaz", name: "Przetargi na zakup energii i gazu dla instytucji" },
    ],
    // Brak gotowego tekstu strony nadrzędnej w materiałach – tekst roboczy do akceptacji (BRAKI.md)
    parentFallback: {
      h1: "Energia elektryczna i gaz dla firm",
      lead: "Porównaj oferty sprzedawców, wybierz model ceny i zamów umowę online",
      body:
        "Szukasz umowy na prąd lub gaz dla firmy? W portalu **Energia w Biznesie** porównasz oferty różnych sprzedawców, wybierzesz okres zakupu i model ceny – od stałej ceny, przez ceny giełdowe BASE/PEAK i SPOT, po taryfy dynamiczne.\n\nWniosek złożysz online: podajesz dane firmy, taryfę i zużycie albo przesyłasz fakturę. Po przygotowaniu ofert wybierasz propozycję i zamawiasz umowę – z pomocą doradcy, jeśli jej potrzebujesz.\n\nObsługujemy także zakup gazu ziemnego, grupy zakupowe oraz przetargi na energię dla instytucji.",
      ctas: ["PORÓWNAJ OFERTY ONLINE", "UMÓW ROZMOWĘ Z DORADCĄ"],
      metaTitle: "Prąd i gaz dla firm – porównanie ofert i umowa online",
      metaDescription:
        "Prąd i gaz dla firm: stała cena, BASE/PEAK, SPOT, taryfy dynamiczne, grupy zakupowe i przetargi. Porównaj oferty i zamów umowę online w Energia w Biznesie.",
    },
  },
  {
    id: 2,
    slug: "audyt-i-optymalizacja-kosztow-energii",
    name: "Audyt i optymalizacja kosztów energii",
    short: "Sprawdź opłaty dystrybucyjne, moc umowną, taryfę i poprawność faktur.",
    icon: "search",
    image: "/img/kategorie/audyt.jpg",
    services: [
      { slug: "audyt-kosztow-dystrybucji-energii", name: "Audyt i optymalizacja kosztów dystrybucji" },
      { slug: "zmniejszenie-mocy-umownej", name: "Zmniejszenie mocy umownej" },
      { slug: "zmiana-grupy-taryfowej-energii", name: "Zmiana grupy taryfowej energii" },
      { slug: "optymalizacja-oplaty-mocowej", name: "Optymalizacja opłaty mocowej" },
      { slug: "analiza-profilu-zuzycia-energii", name: "Analiza profilu zużycia energii" },
      { slug: "zmiana-parametrow-umowy-dystrybucyjnej", name: "Zmiana parametrów umowy dystrybucyjnej" },
      { slug: "weryfikacja-faktur-i-oplat-za-prad", name: "Kontrola i weryfikacja naliczonych opłat" },
    ],
    parentFallback: {
      h1: "Audyt i optymalizacja kosztów energii",
      lead: "Sprawdź, które składniki rachunku za prąd można ograniczyć",
      body:
        "Cena zakupu energii to tylko część rachunku. Na koszty firmy wpływają również opłaty dystrybucyjne, moc umowna, grupa taryfowa, opłata mocowa i energia bierna.\n\n**Energia w Biznesie** analizuje faktury i parametry umowy dystrybucyjnej, wskazuje obszary do optymalizacji i pomaga przygotować zmiany u operatora systemu dystrybucyjnego (OSD).\n\nAudyt może także potwierdzić, że obecne rozliczenia są prawidłowe – każdą rekomendację opieramy na danych, a nie na obietnicach.",
      ctas: ["ZAMÓW AUDYT KOSZTÓW", "PRZEŚLIJ FAKTURĘ DO ANALIZY"],
      metaTitle: "Audyt i optymalizacja kosztów energii dla firm",
      metaDescription:
        "Audyt kosztów energii: dystrybucja, moc umowna, grupa taryfowa, opłata mocowa, profil zużycia i weryfikacja faktur. Sprawdź, gdzie Twoja firma przepłaca.",
    },
  },
  {
    id: 3,
    slug: "prad-budowlany-i-przylacza-energetyczne",
    name: "Prąd budowlany i przyłącza energetyczne",
    short: "Zasilanie inwestycji – od placu budowy po uruchomienie obiektu.",
    icon: "plug",
    image: "/img/kategorie/budowlany.jpg",
    services: [
      { slug: "prad-budowlany-dla-firm", name: "Prąd budowlany dla firm i inwestorów" },
      { slug: "nowe-przylacza-energetyczne", name: "Nowe przyłącza energetyczne" },
      { slug: "przylacza-energetyczne-hale-magazyny", name: "Przyłącza energetyczne do hal i magazynów" },
      { slug: "zmiana-pradu-budowlanego-na-docelowy", name: "Zmiana prądu budowlanego na docelowy" },
      { slug: "zwiekszenie-mocy-przylaczeniowej", name: "Zwiększenie mocy przyłączeniowej" },
      { slug: "dobor-mocy-przylaczeniowej", name: "Dobór mocy przyłączeniowej" },
      { slug: "umowy-przylaczeniowe-i-dystrybucyjne", name: "Umowy przyłączeniowe i dystrybucyjne" },
    ],
  },
  {
    id: 4,
    slug: "energia-bierna-i-kompensacja-mocy",
    name: "Energia bierna i kompensacja mocy",
    short: "Ogranicz opłaty za energię bierną i dobierz kompensację.",
    icon: "wave",
    image: "/img/kategorie/bierna.jpg",
    services: [
      { slug: "analiza-oplat-za-energie-bierna", name: "Analiza opłat za energię bierną" },
      { slug: "kompensacja-mocy-biernej-dla-firm", name: "Kompensacja mocy biernej dla firm" },
      { slug: "kompensacja-energii-biernej-indukcyjnej", name: "Kompensacja energii biernej indukcyjnej" },
      { slug: "kompensacja-energii-biernej-pojemnosciowej", name: "Kompensacja energii biernej pojemnościowej" },
      { slug: "baterie-kondensatorow-dobor-montaz", name: "Baterie kondensatorów – dobór i montaż" },
      { slug: "strazniki-mocy-kontrola-poboru", name: "Strażniki mocy i kontrola poboru energii" },
      { slug: "monitoring-kompensacji-mocy-biernej", name: "Monitoring skuteczności kompensacji" },
    ],
  },
  {
    id: 5,
    slug: "fotowoltaika-i-magazyny-energii",
    name: "Fotowoltaika, magazyny energii i EMS",
    short: "Produkuj, magazynuj i inteligentnie zarządzaj energią.",
    icon: "sun",
    image: "/img/kategorie/pv-magazyn.jpg",
    services: [
      { slug: "magazyny-energii-dla-firm", name: "Magazyny energii dla przedsiębiorstw" },
      { slug: "fotowoltaika-dla-firm", name: "Fotowoltaika dla firm" },
      { slug: "odkup-nadwyzek-energii-z-fotowoltaiki", name: "Odkup nadwyżek energii z fotowoltaiki" },
      { slug: "optymalizacja-instalacji-fotowoltaicznej", name: "Optymalizacja instalacji fotowoltaicznej" },
      { slug: "magazyny-energii-taryfy-dynamiczne", name: "Magazyny energii i taryfy dynamiczne" },
      { slug: "analiza-oplacalnosci-inwestycji-oze", name: "Analiza opłacalności inwestycji OZE" },
      { slug: "zwiekszenie-autokonsumpcji-energii", name: "Zwiększenie autokonsumpcji energii" },
    ],
  },
  {
    id: 6,
    slug: "kontrakty-ppa-i-zielona-energia",
    name: "Kontrakty PPA i zielona energia",
    short: "Długoterminowy zakup energii OZE i gwarancje pochodzenia.",
    icon: "leaf",
    image: "/img/kategorie/fotowoltaika.jpg",
    services: [
      { slug: "umowy-ppa-dla-firm", name: "Umowy PPA – zakup energii od producenta OZE" },
      { slug: "cppa-korporacyjne-kontrakty-oze", name: "cPPA – korporacyjne kontrakty na zieloną energię" },
      { slug: "vppa-wirtualne-kontrakty-ppa", name: "vPPA / uPPA – wirtualne kontrakty PPA" },
      { slug: "gwarancje-pochodzenia-energii-oze", name: "Gwarancje pochodzenia energii OZE" },
      { slug: "zakup-energii-z-farm-oze", name: "Zakup energii z farm fotowoltaicznych i wiatrowych" },
      { slug: "analiza-negocjacje-kontraktow-ppa", name: "Analiza opłacalności i negocjacje kontraktów PPA" },
    ],
  },
  {
    id: 7,
    slug: "spoldzielnie-energetyczne-i-dsr",
    name: "Spółdzielnie energetyczne i DSR",
    short: "Wspólna energia OZE i wynagrodzenie za elastyczność poboru.",
    icon: "users",
    image: "/img/kategorie/spoldzielnie.jpg",
    services: [
      { slug: "zakladanie-spoldzielni-energetycznych", name: "Zakładanie spółdzielni energetycznych" },
      { slug: "oplacalnosc-spoldzielni-energetycznej", name: "Analiza opłacalności spółdzielni" },
      { slug: "dokumentacja-spoldzielni-energetycznej", name: "Dokumentacja i formalności spółdzielni" },
      { slug: "dobor-uczestnikow-spoldzielni-energetycznej", name: "Dobór uczestników spółdzielni energetycznej" },
      { slug: "obsluga-rozliczanie-spoldzielni-energetycznych", name: "Obsługa i rozliczanie spółdzielni" },
      { slug: "dsr-dla-firm-redukcja-poboru", name: "DSR dla firm – wynagrodzenie za redukcję poboru energii" },
      { slug: "przystapienie-do-programu-dsr", name: "Przystąpienie do programu DSR" },
      { slug: "analiza-mozliwosci-redukcji-mocy", name: "Analiza możliwości redukcji mocy" },
      { slug: "dobor-agregatora-dsr", name: "Dobór agregatora DSR" },
      { slug: "uslugi-elastycznosci-energetycznej", name: "Usługi elastyczności energetycznej" },
    ],
  },
  {
    id: 8,
    slug: "umowy-energetyczne-i-sluzebnosc-przesylu",
    name: "Umowy energetyczne i służebność przesyłu",
    short: "Wypowiedzenia, kary umowne, renegocjacje i roszczenia za linie.",
    icon: "scale",
    image: "/img/kategorie/przylacza.jpg",
    services: [
      { slug: "wypowiedzenie-umowy-na-prad-i-gaz", name: "Wypowiedzenie umowy na prąd i gaz" },
      { slug: "wczesniejsze-rozwiazanie-umowy-energetycznej", name: "Wcześniejsze rozwiązanie umowy energetycznej" },
      { slug: "kary-za-niewykorzystany-wolumen-energii-gazu", name: "Kary za niewykorzystany wolumen energii i gazu" },
      { slug: "analiza-kar-za-zerwanie-umowy-energetycznej", name: "Analiza kar umownych za zerwanie umowy" },
      { slug: "renegocjacja-umow-energetycznych", name: "Renegocjacja niekorzystnych umów energetycznych" },
      { slug: "odszkodowanie-za-slupy-energetyczne", name: "Odszkodowanie za słupy energetyczne na działce" },
      { slug: "wynagrodzenie-za-sluzebnosc-przesylu", name: "Wynagrodzenie za ustanowienie służebności przesyłu" },
      { slug: "roszczenia-za-linie-energetyczne", name: "Roszczenia związane z liniami energetycznymi" },
      { slug: "analiza-dokumentacji-negocjacje-z-operatorem", name: "Analiza dokumentacji i negocjacje z operatorem" },
    ],
  },
  {
    id: 9,
    slug: "energia-360",
    name: "Doradztwo i opieka energetyczna Energia 360",
    short: "Stała opieka: zakup, negocjacje, kontrola faktur i strategia.",
    icon: "shield",
    image: "/img/kategorie/opieka360.jpg",
    services: [
      { slug: "kompleksowa-obsluga-energetyczna-firm", name: "Kompleksowa obsługa energetyczna firm" },
      { slug: "stala-opieka-nad-umowami-energetycznymi", name: "Stała opieka nad umowami energetycznymi" },
      { slug: "negocjowanie-cen-energii-i-gazu", name: "Negocjowanie cen energii i gazu" },
      { slug: "zarzadzanie-zakupem-energii", name: "Zarządzanie zakupem energii" },
      { slug: "monitoring-rynku-i-cen-energii", name: "Monitoring rynku i cen energii" },
      { slug: "stala-kontrola-faktur-i-kosztow-energii", name: "Kontrola faktur i kosztów energii" },
      { slug: "reprezentowanie-firmy-przed-sprzedawcami-i-osd", name: "Reprezentowanie firmy przed sprzedawcami i OSD" },
      { slug: "strategia-zakupowa-energii", name: "Strategia zakupowa energii na kolejne lata" },
    ],
  },
  {
    id: 10,
    slug: "serwis-i-infrastruktura-energetyczna",
    name: "Serwis i infrastruktura energetyczna",
    short: "Przeglądy, diagnostyka, pogotowie i modernizacja instalacji.",
    icon: "wrench",
    image: "/img/kategorie/serwis.jpg",
    services: [
      { slug: "pogotowie-energetyczne-dla-firm", name: "Pogotowie energetyczne dla firm" },
      { slug: "serwis-stacji-transformatorowych", name: "Serwis stacji transformatorowych" },
      { slug: "przeglady-instalacji-elektrycznych", name: "Przeglądy instalacji elektrycznych" },
      { slug: "diagnostyka-instalacji-elektrycznych", name: "Diagnostyka instalacji elektrycznych" },
      { slug: "modernizacja-rozdzielni-i-rozdzielnic", name: "Modernizacja rozdzielni i rozdzielnic" },
      { slug: "serwis-urzadzen-elektroenergetycznych", name: "Serwis urządzeń elektroenergetycznych" },
      { slug: "usuwanie-awarii-energetycznych", name: "Usuwanie awarii energetycznych" },
      { slug: "modernizacja-infrastruktury-energetycznej", name: "Renowacja i modernizacja infrastruktury energetycznej" },
    ],
  },
];

export const CATEGORIES: Category[] = DEFS.map(({ parentFallback, ...c }) => {
  const parsed = raw.parents[String(c.id)];
  const parent: Parent = parsed?.h1 ? parsed : parentFallback ?? { h1: c.name, lead: null, body: "", ctas: [], metaTitle: null, metaDescription: null };
  return { ...c, parent, module: raw.modules[String(c.id)] ?? null };
});

const pagesBySlug = new Map(raw.pages.map((p) => [p.slug, p]));

export function getService(slug: string): ServicePage | undefined {
  return pagesBySlug.get(slug);
}
export function getCategory(slug: string): Category | undefined {
  return CATEGORIES.find((c) => c.slug === slug);
}
export function categoryOf(page: ServicePage): Category {
  return CATEGORIES.find((c) => c.id === page.category)!;
}
export function serviceName(slug: string): string {
  for (const c of CATEGORIES) {
    const s = c.services.find((x) => x.slug === slug);
    if (s) return s.name;
  }
  return pagesBySlug.get(slug)?.name ?? slug;
}
export function allServiceSlugs(): string[] {
  return CATEGORIES.flatMap((c) => c.services.map((s) => s.slug));
}

/** Wybrane pytania z odpowiedziami do sekcji FAQ na stronie głównej. */
export function featuredFaq(limit = 6): Faq[] {
  const picks = ["prad-dla-firm-stala-cena", "energia-spot-dla-firm", "gaz-dla-firm-zmiana-sprzedawcy", "zmniejszenie-mocy-umownej", "weryfikacja-faktur-i-oplat-za-prad", "kompleksowa-obsluga-energetyczna-firm"];
  const out: Faq[] = [];
  for (const slug of picks) {
    const f = pagesBySlug.get(slug)?.faq[0];
    if (f) out.push(f);
  }
  return out.slice(0, limit);
}

// Kontrola spójności na etapie budowania: każda pozycja menu musi mieć treść.
for (const c of CATEGORIES)
  for (const s of c.services)
    if (!pagesBySlug.has(s.slug)) throw new Error(`Brak treści dla podstrony: ${s.slug}`);
