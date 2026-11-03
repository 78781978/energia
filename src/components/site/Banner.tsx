import Link from "next/link";

/**
 * Grafika (baner) pokazywana w całości – bez kadrowania, z tekstami tak, jak przygotował je projektant.
 * Tekst z grafiki powtarzamy w `alt` (czytniki ekranu, Google), bo napisy na obrazku nie są tekstem strony.
 */
export const BANNERS = {
  lepszaEnergia: {
    src: "/img/banery/lepsza-energia.jpg",
    w: 1536,
    h: 1024,
    alt: "Energia w Biznesie. Lepsza energia dla Twojej firmy. Porównaj oferty dostawców, wybierz najlepszą i załatw wszystko online – szybko i bez zbędnych formalności. Porównaj oferty. Porównanie ofert, prosty proces, oszczędność czasu.",
  },
  rozwiazania: {
    src: "/img/banery/rozwiazania.jpg",
    w: 1536,
    h: 1024,
    alt: "Wszystkie rozwiązania energetyczne w jednym miejscu. Wybierz produkt dopasowany do potrzeb Twojej firmy i zyskaj realne oszczędności. Energia elektryczna, gaz ziemny, audyt energetyczny, OZE dla firm. Zobacz produkty.",
  },
  spoldzielnie: {
    src: "/img/banery/spoldzielnie.jpg",
    w: 1536,
    h: 1024,
    alt: "Platforma do zakupu energii online. Spółdzielnie energetyczne. Wspólna energia. Większe możliwości. Dowiedz się więcej.",
  },
  kierunek: {
    src: "/img/banery/kierunek.jpg",
    w: 1254,
    h: 1254,
    alt: "Platforma do zakupu energii online. Nowy kierunek dla Twojego biznesu. Energia online. Więcej możliwości. Wejdź na portal.",
  },
  doradca: {
    src: "/img/banery/doradca.jpg",
    w: 1254,
    h: 1254,
    alt: "Platforma do zakupu energii online. Czy masz doradcę, który naprawdę dba o Twoje rachunki za energię? Realne wsparcie. Korzystniejsze rozwiązania.",
  },
  proces: {
    src: "/img/banery/proces.jpg",
    w: 1280,
    h: 853,
    alt: "Proces zakupu energii w 7 krokach: 1. Wybierz media, dla których chcesz otrzymać ofertę (prąd, gaz, prąd + gaz). 2. Wybierz lata, na które chcesz zabezpieczyć zakup energii. 3. Wybierz wariant zakupu (model ceny). 4. Podaj taryfę oraz szacowane roczne zużycie energii. 5. Wczytaj fakturę za prąd (PDF). 6. Wczytywanie danych z faktury i ich weryfikacja. 7. Wyślij zamówienie lub zamów rozmowę z doradcą.",
  },
  mapaUslug: {
    src: "/img/banery/mapa-uslug.jpg",
    w: 1280,
    h: 853,
    alt: "Mapa usług: 1. Energia elektryczna i gaz dla firm. 2. Audyt i optymalizacja kosztów energii. 3. Prąd budowlany i przyłącza energetyczne. 4. Energia bierna i kompensacja mocy. 5. Fotowoltaika i magazyny energii. 6. Kontrakty PPA i zielona energia. 7. Spółdzielnie energetyczne i DSR. 8. Umowy energetyczne i służebność przesyłu. 9. Doradztwo i opieka energetyczna Energia 360. 10. Serwis i infrastruktura energetyczna. Produkty dodatkowe i rozwiązania specjalne.",
  },
  ilustracje: {
    src: "/img/banery/ilustracje-uslug.jpg",
    w: 1280,
    h: 853,
    alt: "Ilustracje usług Energia w Biznesie: energia elektryczna i gaz dla firm, obniżenie kosztów energii, przyłącza energetyczne, energia bierna i kompensacja, fotowoltaika i magazyny energii, spółdzielnie energetyczne, opieka energetyczna Energia 360, serwis i infrastruktura oraz ikony poszczególnych usług.",
  },
} as const;

export type BannerKey = keyof typeof BANNERS;

export function Banner({ name, href, label, priority = false, className = "" }: { name: BannerKey; href?: string; label?: string; priority?: boolean; className?: string }) {
  const b = BANNERS[name];
  const img = (
    <img
      src={b.src}
      alt={b.alt}
      width={b.w}
      height={b.h}
      loading={priority ? "eager" : "lazy"}
      fetchPriority={priority ? "high" : undefined}
      decoding="async"
    />
  );
  return (
    <figure className={`banner ${className}`}>
      {href ? (
        <Link href={href} aria-label={label} className="banner__link">
          {img}
        </Link>
      ) : (
        img
      )}
    </figure>
  );
}
