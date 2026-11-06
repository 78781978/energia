/**
 * Dane firmy wyświetlane w serwisie.
 * Dane z polityki prywatności i regulaminu (5.11.2026). Pola `null` są ukrywane; w panelu (Ustawienia) można je nadpisać.
 */
export const SITE = {
  brand: "Energia w Biznesie",
  portalBrand: "Energia Online",
  url: (process.env.SITE_URL || "http://localhost:3000").replace(/\/$/, ""),
  tagline: "Doradztwo energetyczne i portal do zakupu energii online dla firm",
  description:
    "Porównaj oferty prądu i gazu dla firm, zamów umowę online i skorzystaj z doradztwa energetycznego Energia 360: audyt kosztów, przyłącza, PPA, OZE i serwis.",
  // --- do uzupełnienia przez klienta ---
  legalName: "Energia w biznesie Barbara Krzyworzeka" as string | null, // pełna nazwa podmiotu
  nip: "5130159227" as string | null,
  regon: "367736343" as string | null,
  krs: null as string | null,
  address: "ul. Kwiatów Polnych 8, Wola Więcławska, 32-091 Michałowice" as string | null,
  phone: "12 373 99 89" as string | null,
  email: "biuro@energiawbiznesie.com" as string | null,
  openingHours: "pon.–pt. 8:00–16:00",
  social: { linkedin: null as string | null, facebook: "https://www.facebook.com/profile.php?id=61595353048245" as string | null },
};

export const PORTAL_REGISTER = "/portal/wniosek/";
export const PORTAL_LOGIN = "/portal/logowanie/";
export const PORTAL_NEW_APPLICATION = "/portal/wniosek/";
