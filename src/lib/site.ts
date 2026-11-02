/**
 * Dane firmy wyświetlane w serwisie.
 * Pola ustawione na `null` są ukrywane – uzupełnij je, gdy otrzymasz dane (zob. BRAKI.md).
 */
export const SITE = {
  brand: "Energia w Biznesie",
  portalBrand: "Energia Online",
  url: (process.env.SITE_URL || "http://localhost:3000").replace(/\/$/, ""),
  tagline: "Doradztwo energetyczne i portal do zakupu energii online dla firm",
  description:
    "Porównaj oferty prądu i gazu dla firm, zamów umowę online i skorzystaj z doradztwa energetycznego Energia 360: audyt kosztów, przyłącza, PPA, OZE i serwis.",
  // --- do uzupełnienia przez klienta ---
  legalName: null as string | null, // pełna nazwa podmiotu, np. „Energia w Biznesie sp. z o.o.”
  nip: null as string | null,
  krs: null as string | null,
  address: null as string | null, // „ul. …, 00-000 Miasto”
  phone: null as string | null, // „+48 000 000 000”
  email: null as string | null, // „kontakt@…”
  openingHours: "pon.–pt. 8:00–17:00",
  social: { linkedin: null as string | null, facebook: null as string | null },
};

export const PORTAL_REGISTER = "/portal/rejestracja/";
export const PORTAL_LOGIN = "/portal/logowanie/";
export const PORTAL_NEW_APPLICATION = "/portal/wniosek/";
