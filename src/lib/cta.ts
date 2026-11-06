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

export type CtaItem = { raw: string; label: string; target: CtaTarget };

/**
 * Przyciski jednego rzędu: tylko pierwszy prowadzi do portalu, kolejne „portalowe” – do kontaktu z doradcą
 * (np. „Porównaj ceny” → portal, „Zamów umowę online” → rozmowa z doradcą). Jeśli w materiałach jest już przycisk
 * kontaktowy, nadmiarowe przyciski do portalu są pomijane, żeby dwa przyciski obok siebie nie prowadziły w to samo miejsce.
 */
export function ctaRow(raws: string[], slug?: string, max = 3): CtaItem[] {
  const seen = new Set<string>();
  const all = raws
    .map((raw) => ({ raw, label: ctaLabel(raw), target: ctaTarget(raw, { slug }) }))
    .filter((c) => (seen.has(c.label) ? false : (seen.add(c.label), true)));
  const hasContact = all.some((c) => c.target.kind === "contact");
  let portalSeen = false;
  const out: CtaItem[] = [];
  for (const c of all) {
    if (c.target.kind === "portal") {
      if (!portalSeen) {
        portalSeen = true;
        out.push(c);
      } else if (!hasContact) {
        const q = new URLSearchParams({ typ: "rozmowa" });
        if (slug) q.set("usluga", slug);
        q.set("temat", c.label);
        out.push({ ...c, target: { href: `/kontakt/?${q.toString()}`, kind: "contact" } });
      }
    } else out.push(c);
  }
  return out.slice(0, max);
}
