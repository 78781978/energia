/**
 * Ceny energii – wyłącznie dla administratorów:
 *  1) ceny rynkowe pobierane automatycznie z publicznego API PSE (rynkowa cena energii RCE, zł/MWh, co 15 min),
 *  2) cenniki sprzedawców wklejane co tydzień z Excela (tabela) – do porównań przy przygotowywaniu ofert.
 * Żadne z tych danych nie są pokazywane klientom ani w serwisie publicznym.
 */
import { db } from "./db";

export const PSE_SOURCE = "PSE_RCE";
const PSE_URL = "https://api.raporty.pse.pl/api/rce-pln";

/** Data w strefie Polski w formacie RRRR-MM-DD. */
export function plDay(d = new Date(), addDays = 0): string {
  const t = new Date(d.getTime() + addDays * 86400e3);
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Warsaw" }).format(t);
}

type RceRow = { rce_pln?: number | string; period?: string; dtime?: string; business_date?: string };

/** Pobiera ceny RCE z jednej doby i zapisuje średnie (dobowa, min/max, szczyt 7–22, godzinowe). null = brak publikacji. */
export async function fetchPseDay(day: string): Promise<{ day: string; avg: number } | null> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) throw new Error("Zły format daty.");
  const rows: RceRow[] = [];
  let url: string | null = `${PSE_URL}?$filter=${encodeURIComponent(`business_date eq '${day}'`)}&$first=200`;
  for (let page = 0; url && page < 5; page++) {
    const res: Response = await fetch(url, { headers: { Accept: "application/json" }, signal: AbortSignal.timeout(15000), cache: "no-store" });
    if (!res.ok) throw new Error(`PSE odpowiedziało błędem ${res.status}.`);
    const json = (await res.json()) as { value?: RceRow[]; nextLink?: string };
    rows.push(...(json.value ?? []));
    url = json.nextLink && json.nextLink.startsWith(PSE_URL) ? json.nextLink : null;
  }
  const pts = rows
    .map((r) => ({ v: Number(r.rce_pln), h: Number((r.period ?? "").slice(0, 2)) }))
    .filter((p) => Number.isFinite(p.v) && p.h >= 0 && p.h < 24);
  if (!pts.length) return null;

  const hours: number[][] = Array.from({ length: 24 }, () => []);
  for (const p of pts) hours[p.h].push(p.v);
  const hourly = hours.map((a) => (a.length ? round(a.reduce((s, x) => s + x, 0) / a.length) : null));
  const vals = pts.map((p) => p.v);
  const peak = pts.filter((p) => p.h >= 7 && p.h < 22).map((p) => p.v);
  const data = {
    avg: round(vals.reduce((s, x) => s + x, 0) / vals.length),
    min: round(Math.min(...vals)),
    max: round(Math.max(...vals)),
    peakAvg: peak.length ? round(peak.reduce((s, x) => s + x, 0) / peak.length) : null,
    hourly: JSON.stringify(hourly),
    points: pts.length,
    fetchedAt: new Date(),
  };
  await db.marketPrice.upsert({ where: { source_day: { source: PSE_SOURCE, day } }, create: { source: PSE_SOURCE, day, ...data }, update: data });
  return { day, avg: data.avg };
}

/**
 * Uzupełnia brakujące doby (domyślnie ostatnie 14 dni) i zawsze odświeża dziś i jutro
 * (PSE publikuje ceny na kolejną dobę po południu). Zwraca liczbę zapisanych dób.
 */
export async function syncMarketPrices(daysBack = 14): Promise<{ saved: number; errors: string[] }> {
  const wanted = Array.from({ length: daysBack + 2 }, (_, i) => plDay(new Date(), 1 - i));
  const have = new Set(
    (await db.marketPrice.findMany({ where: { source: PSE_SOURCE, day: { in: wanted } }, select: { day: true, points: true } }))
      .filter((r) => r.points >= 90)
      .map((r) => r.day),
  );
  const today = plDay();
  const tomorrow = plDay(new Date(), 1);
  let saved = 0;
  const errors: string[] = [];
  for (const day of wanted) {
    if (have.has(day) && day !== today && day !== tomorrow) continue;
    try {
      if (await fetchPseDay(day)) saved++;
    } catch (e) {
      errors.push(`${day}: ${(e as Error).message}`);
      if (errors.length >= 3) break; // API niedostępne – nie próbujemy dalej
    }
  }
  return { saved, errors };
}

const round = (n: number) => Math.round(n * 100) / 100;

/* ------------------------------------------------------------ cenniki sprzedawców */

export type PriceRow = { media: string; product: string; tariff: string | null; year: string | null; price: number; tradeFee: number | null; note: string | null };

const strip = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/ł/g, "l")
    .replace(/[^a-z0-9/ ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const COLUMNS: { key: keyof PriceRow; test: RegExp }[] = [
  { key: "media", test: /^(media|medium|nosnik|rodzaj|energia\/gaz|prad\/gaz)/ },
  { key: "tradeFee", test: /(oplata|handlow|abonament)/ },
  { key: "price", test: /(cena|stawka|zl\/mwh|mwh)/ },
  { key: "product", test: /(produkt|model|wariant|oferta|nazwa)/ },
  { key: "tariff", test: /(taryf|grupa)/ },
  { key: "year", test: /^(rok|lata|okres)/ },
  { key: "note", test: /(uwag|opis|komentarz)/ },
];

/** Liczba w polskim zapisie: „1 234,56”, „612.5 zł”. */
export function plNumber(s: string): number | null {
  const t = s.replace(/[\s ]/g, "").replace(/zł|zl|pln/gi, "").replace(/\/mwh|\/mies\.?/gi, "");
  if (!t) return null;
  const norm = t.includes(",") && t.includes(".") ? t.replace(/\./g, "").replace(",", ".") : t.replace(",", ".");
  const n = Number(norm);
  return Number.isFinite(n) ? n : null;
}

/**
 * Tabela wklejona z Excela (kolumny oddzielone tabulatorem), CSV (; lub ,).
 * Pierwszy wiersz – nagłówki. Wymagana kolumna z ceną; pozostałe: media, produkt, taryfa, rok, opłata handlowa, uwagi.
 */
export function parsePriceTable(text: string): { rows: PriceRow[]; errors: string[] } {
  const lines = text.replace(/\r/g, "").split("\n").filter((l) => l.trim());
  if (lines.length < 2) return { rows: [], errors: ["Wklej tabelę z nagłówkami w pierwszym wierszu i co najmniej jednym wierszem z ceną."] };
  const delim = lines[0].includes("\t") ? "\t" : (lines[0].match(/;/g)?.length ?? 0) > 0 ? ";" : ",";
  const head = lines[0].split(delim).map(strip);
  const map = new Map<keyof PriceRow, number>();
  head.forEach((h, i) => {
    const c = COLUMNS.find((c) => !map.has(c.key) && c.test.test(h));
    if (c) map.set(c.key, i);
  });
  if (!map.has("price"))
    return { rows: [], errors: ["Nie znaleziono kolumny z ceną. Nagłówek powinien zawierać np. „Cena zł/MWh”."] };

  const rows: PriceRow[] = [];
  const errors: string[] = [];
  for (let n = 1; n < lines.length && rows.length < 2000; n++) {
    const cells = lines[n].split(delim).map((c) => c.trim().replace(/^"|"$/g, ""));
    const get = (k: keyof PriceRow) => (map.has(k) ? cells[map.get(k)!] ?? "" : "");
    const price = plNumber(get("price"));
    if (price == null) {
      if (cells.some((c) => c)) errors.push(`Wiersz ${n + 1}: brak poprawnej ceny („${get("price") || "puste"}”) – pominięty.`);
      continue;
    }
    if (price <= 0 || price > 100000) {
      errors.push(`Wiersz ${n + 1}: cena ${price} poza zakresem – pominięty.`);
      continue;
    }
    const m = strip(get("media"));
    rows.push({
      media: /gaz/.test(m) ? "GAZ" : "PRAD",
      product: get("product").slice(0, 120) || "Stała cena",
      tariff: get("tariff").slice(0, 30) || null,
      year: get("year").replace(/[^\d,–\- ]/g, "").trim().slice(0, 30) || null,
      price,
      tradeFee: plNumber(get("tradeFee")),
      note: get("note").slice(0, 300) || null,
    });
  }
  if (!rows.length && !errors.length) errors.push("Tabela nie zawiera żadnych cen.");
  return { rows, errors: errors.slice(0, 20) };
}

/** Status cennika względem dzisiejszej daty. */
export function priceListStatus(l: { validFrom: Date; validTo: Date | null }, now = new Date()): "AKTUALNY" | "PRZYSZLY" | "ARCHIWALNY" {
  if (l.validFrom > now) return "PRZYSZLY";
  if (l.validTo && l.validTo < startOfDay(now)) return "ARCHIWALNY";
  return "AKTUALNY";
}

export function startOfDay(d: Date): Date {
  const t = new Date(d);
  t.setHours(0, 0, 0, 0);
  return t;
}
