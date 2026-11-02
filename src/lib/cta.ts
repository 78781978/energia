import { PORTAL_REGISTER } from "./site";

const ACRONYMS = ["PPA", "cPPA", "vPPA", "uPPA", "DSR", "OZE", "SPOT", "BASE/PEAK", "BASE", "PEAK", "PV", "OSD", "EMS", "TGE", "RDN", "PPE", "SN/nN", "AI"];

/** „ZAMÓW UMOWĘ ONLINE” → „Zamów umowę online” (z zachowaniem skrótów i nazw własnych). */
export function ctaLabel(raw: string): string {
  let s = raw.toLocaleLowerCase("pl-PL");
  s = s.charAt(0).toLocaleUpperCase("pl-PL") + s.slice(1);
  for (const a of ACRONYMS) {
    s = s.replace(new RegExp(`(^|[\\s(/])${a.toLowerCase().replace("/", "\\/")}(?=$|[\\s),.?!/])`, "gi"), (_m, p1) => p1 + a);
  }
  s = s.replace(/energia 360/gi, "Energia 360").replace(/energia w biznesie/gi, "Energia w Biznesie");
  return s;
}

export type CtaTarget = { href: string; kind: "portal" | "contact" };

/** Na podstawie treści przycisku z materiałów wybiera właściwy cel: portal zakupowy albo formularz kontaktowy. */
export function ctaTarget(raw: string, context: { slug?: string } = {}): CtaTarget {
  const t = raw.toLocaleUpperCase("pl-PL");
  const portal = /(ONLINE|ZAMÓW UMOWĘ|PORTAL|ZAŁÓŻ|ROZPOCZNIJ|PORÓWNAJ (OFERTY|CENY)|ZAMÓW ENERGIĘ|DOŁĄCZ DO GRUPY ZAKUPOWEJ ONLINE)/.test(t);
  if (portal && !/ANALIZ|AUDYT|KONSULTAC|DORADC/.test(t)) return { href: PORTAL_REGISTER, kind: "portal" };
  const type = /ROZMOW|DORADC|KONSULTAC/.test(t) ? "rozmowa" : /FAKTUR|PRZEŚLIJ DANE/.test(t) ? "analiza" : "kontakt";
  const q = new URLSearchParams({ typ: type });
  if (context.slug) q.set("usluga", context.slug);
  q.set("temat", ctaLabel(raw));
  return { href: `/kontakt/?${q.toString()}`, kind: "contact" };
}
