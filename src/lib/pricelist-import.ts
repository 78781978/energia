/**
 * Import cenników sprzedawców z plików PDF i Excel (XLSX) – tylko dla administratorów.
 * Plik jest zamieniany na wiersze komórek (PDF: tekst z pdf.js pogrupowany po położeniu, XLSX: komórki arkusza),
 * a następnie rozpoznawany jest format sprzedawcy:
 *  - Audax Renewables: cotygodniowy cennik gazu (taryfy W1–W6 × okresy dostaw, opłata handlowa w osobnej tabeli),
 *  - Enefit: cennik FIX prądu i gazu (taryfy × lata, strefy/płaska, ceny minimalne i maksymalne).
 * Moduł nie importuje nic z aliasów „@/…”, żeby dało się go testować bez kompilacji całej aplikacji.
 */

export type ImportItem = {
  media: "PRAD" | "GAZ";
  product: string;
  tariff: string;
  zone: string | null;
  period: string | null;
  year: string | null;
  price: number;
  priceMax: number | null;
  tradeFee: number | null;
  code: string | null;
  note: string | null;
};

export type ImportResult = {
  format: "AUDAX_GAZ" | "ENEFIT_FIX";
  supplier: string;
  number: string | null;
  media: "PRAD" | "GAZ" | null;
  validFrom: Date | null;
  validTo: Date | null;
  items: ImportItem[];
  conditions: string[];
  warnings: string[];
};

export class ImportError extends Error {}

type Row = string[];

/* -------------------------------------------------------------------- odczyt plików */

const MAX_XML = 20 * 1024 * 1024;

/** Rozpoznaje typ pliku po zawartości (nie po rozszerzeniu). */
export function sniffKind(buf: Uint8Array): "pdf" | "xlsx" | null {
  if (buf[0] === 0x25 && buf[1] === 0x50 && buf[2] === 0x44 && buf[3] === 0x46) return "pdf"; // %PDF
  if (buf[0] === 0x50 && buf[1] === 0x4b && buf[2] === 0x03 && buf[3] === 0x04) return "xlsx"; // PK.. (zip)
  return null;
}

export async function fileToRows(buf: Uint8Array): Promise<Row[]> {
  const kind = sniffKind(buf);
  if (kind === "pdf") return pdfRows(buf);
  if (kind === "xlsx") return xlsxRows(buf);
  throw new ImportError("Nieobsługiwany plik. Dodaj cennik w formacie PDF albo Excel (.xlsx).");
}

/** PDF → wiersze: elementy tekstu z tej samej wysokości strony, od lewej do prawej. */
async function pdfRows(buf: Uint8Array): Promise<Row[]> {
  const { getDocumentProxy } = await import("unpdf");
  // pdf.js 6.x – tylko odczyt tekstu, bez wykonywania kodu z pliku
  const pdf = await getDocumentProxy(new Uint8Array(buf), { useSystemFonts: false, stopAtErrors: false });
  const out: Row[] = [];
  for (let p = 1; p <= Math.min(pdf.numPages, 40); p++) {
    const page = await pdf.getPage(p);
    const tc = await page.getTextContent();
    const items = (tc.items as { str?: string; transform?: number[] }[])
      .filter((i) => i.str && i.str.trim() && i.transform)
      .map((i) => ({ s: i.str!.trim(), x: i.transform![4], y: i.transform![5] }));
    items.sort((a, b) => b.y - a.y || a.x - b.x);
    const rows: { y: number; items: typeof items }[] = [];
    for (const it of items) {
      const r = rows.find((r) => Math.abs(r.y - it.y) <= 3);
      if (r) r.items.push(it);
      else rows.push({ y: it.y, items: [it] });
    }
    rows.sort((a, b) => b.y - a.y);
    for (const r of rows) out.push(r.items.sort((a, b) => a.x - b.x).map((i) => i.s));
  }
  return out;
}

const xmlText = (s: string) =>
  s
    .replace(/<[^>]+>/g, "")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&amp;/g, "&");

const colIndex = (ref: string) => {
  const letters = ref.replace(/\d+/g, "");
  let n = 0;
  for (const ch of letters) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n - 1;
};

/** XLSX → wiersze komórek (wszystkie arkusze po kolei). Liczby jak w Excelu po polsku, daty jako DD.MM.RRRR. */
async function xlsxRows(buf: Uint8Array): Promise<Row[]> {
  const { unzipSync, strFromU8 } = await import("fflate");
  let total = 0;
  let files: Record<string, Uint8Array>;
  try {
    files = unzipSync(buf, {
      filter: (f) => {
        if (!/^xl\/(sharedStrings|workbook|styles)\.xml$|^xl\/worksheets\/sheet\d+\.xml$|^xl\/_rels\/workbook\.xml\.rels$/.test(f.name)) return false;
        total += f.originalSize;
        if (f.originalSize > MAX_XML || total > 3 * MAX_XML) throw new ImportError("Plik Excel jest zbyt duży.");
        return true;
      },
    });
  } catch (e) {
    if (e instanceof ImportError) throw e;
    throw new ImportError("Nie udało się odczytać pliku Excel.");
  }
  const get = (n: string) => (files[n] ? strFromU8(files[n]) : "");
  if (/<!DOCTYPE|<!ENTITY/i.test(Object.values(files).map((f) => strFromU8(f.subarray(0, 2048))).join(""))) throw new ImportError("Niedozwolona zawartość pliku Excel.");

  const shared = [...get("xl/sharedStrings.xml").matchAll(/<si>([\s\S]*?)<\/si>/g)].map((m) =>
    [...m[1].matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((t) => xmlText(t[1])).join(""),
  );
  // style dat: numFmtId 14–22, 45–47 albo własne formaty z d/m/y
  const styles = get("xl/styles.xml");
  const customDate = new Set(
    [...styles.matchAll(/<numFmt [^>]*numFmtId="(\d+)"[^>]*formatCode="([^"]*)"/g)].filter((m) => /[dmy]/i.test(m[2].replace(/\[[^\]]*\]|"[^"]*"/g, ""))).map((m) => Number(m[1])),
  );
  const xfs = (styles.match(/<cellXfs[^>]*>([\s\S]*?)<\/cellXfs>/)?.[1] ?? "").match(/<xf [^>]*?\/?>/g) ?? [];
  const isDateStyle = xfs.map((xf) => {
    const id = Number(xf.match(/numFmtId="(\d+)"/)?.[1] ?? 0);
    return (id >= 14 && id <= 22) || (id >= 45 && id <= 47) || customDate.has(id);
  });

  // kolejność arkuszy z workbook.xml
  const rels = Object.fromEntries([...get("xl/_rels/workbook.xml.rels").matchAll(/<Relationship [^>]*Id="([^"]+)"[^>]*Target="([^"]+)"/g)].map((m) => [m[1], m[2]]));
  const sheetFiles = [...get("xl/workbook.xml").matchAll(/<sheet [^>]*r:id="([^"]+)"/g)]
    .map((m) => rels[m[1]])
    .filter(Boolean)
    .map((t) => "xl/" + t.replace(/^\/?xl\//, ""));
  const names = sheetFiles.length ? sheetFiles : Object.keys(files).filter((n) => n.startsWith("xl/worksheets/")).sort();

  const out: Row[] = [];
  for (const name of names) {
    const xml = get(name);
    for (const rm of xml.matchAll(/<row[^>]*>([\s\S]*?)<\/row>/g)) {
      const cells: string[] = [];
      for (const cm of rm[1].matchAll(/<c ([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
        const attrs = cm[1];
        const inner = cm[2] ?? "";
        const ref = attrs.match(/r="([A-Z]+\d+)"/)?.[1];
        const t = attrs.match(/t="(\w+)"/)?.[1];
        const s = Number(attrs.match(/s="(\d+)"/)?.[1] ?? -1);
        const v = inner.match(/<v>([\s\S]*?)<\/v>/)?.[1];
        let val = "";
        if (t === "s" && v != null) val = shared[Number(v)] ?? "";
        else if (t === "inlineStr") val = [...inner.matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((x) => xmlText(x[1])).join("");
        else if ((t === "str" || t === "e") && v != null) val = xmlText(v);
        else if (t === "b" && v != null) val = v === "1" ? "PRAWDA" : "FAŁSZ";
        else if (v != null) {
          const n = Number(v);
          if (Number.isFinite(n) && isDateStyle[s]) val = excelDate(n);
          else if (Number.isFinite(n)) val = Number.isInteger(n) ? String(n) : (Math.round(n * 100) / 100).toFixed(2).replace(".", ",");
          else val = v;
        }
        val = val.replace(/ /g, " ").trim();
        if (!val) continue;
        const idx = ref ? colIndex(ref) : cells.length;
        cells[idx] = val;
      }
      const row = cells.filter((c) => c != null && c !== "");
      if (row.length) out.push(row);
    }
  }
  return out;
}

function excelDate(serial: number): string {
  const d = new Date(Math.round((serial - 25569) * 86400e3));
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getUTCDate())}.${p(d.getUTCMonth() + 1)}.${d.getUTCFullYear()}`;
}

/* -------------------------------------------------------------------- pomocnicze */

/** „1 048,54”, „497,01”, „10” → liczba; „---” → null. */
export function num(s: string | undefined): number | null {
  if (!s) return null;
  const t = s.replace(/[\s ]/g, "").replace(/zł|pln/gi, "");
  if (!/^-?\d+([.,]\d+)?$/.test(t)) return null;
  const n = Number(t.replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

const plDate = (d: string, m: string, y: string) => {
  const dt = new Date(Number(y), Number(m) - 1, Number(d));
  return Number.isNaN(dt.getTime()) ? null : dt;
};

/** Okres dostaw „01/12/2026–31/12/2027” → etykieta lat: „2027”, „2027–2028”, „12.2026–2027”. */
function periodLabel(a: string, b: string): { period: string; year: string } {
  const [d1, m1, y1] = a.split(/[/.]/);
  const [d2, m2, y2] = b.split(/[/.]/);
  const period = `${d1}.${m1}.${y1}–${d2}.${m2}.${y2}`;
  const fullStart = d1 === "01" && m1 === "01";
  const fullEnd = d2 === "31" && m2 === "12";
  if (y1 === y2) {
    if (fullStart && fullEnd) return { period, year: y1 };
    return { period, year: m1 === m2 ? `${m1}.${y1}` : `${m1}–${m2}.${y1}` };
  }
  const start = fullStart ? y1 : `${m1}.${y1}`;
  const end = fullEnd ? y2 : `${m2}.${y2}`;
  return { period, year: `${start}–${end}` };
}

function conditions(rows: Row[]): string[] {
  const out: string[] = [];
  for (const r of rows) {
    const t = r.join(" ").replace(/\s+/g, " ").trim();
    const m = t.match(/^[·•\-§]\s*(.{8,})$/);
    if (m && !out.includes(m[1])) out.push(m[1].slice(0, 300));
    if (out.length >= 30) break;
  }
  return out;
}

/* -------------------------------------------------------------------- Audax – gaz */

function parseAudax(rows: Row[]): ImportResult {
  const warnings: string[] = [];
  const flat = rows.map((r) => r.join(" "));
  const nrRow = rows.find((r) => r.some((c) => /^Cennik nr$/i.test(c)));
  const number = nrRow ? nrRow[nrRow.findIndex((c) => /^Cennik nr$/i.test(c)) + 1] ?? null : null;
  const dates = flat
    .slice(0, 15)
    .flatMap((t) => [...t.matchAll(/\b(\d{2})\.(\d{2})\.(\d{4})\b/g)])
    .map((m) => plDate(m[1], m[2], m[3]))
    .filter(Boolean) as Date[];

  const items: ImportItem[] = [];
  const fees = new Map<string, { eFaktura: number | null; papier: number | null }>();
  let periods: { period: string; year: string }[] = [];
  let inFees = false;
  for (const r of rows) {
    const text = r.join(" ");
    if (/OP[ŁL]ATA HANDLOWA/i.test(text)) {
      inFees = true;
      continue;
    }
    const ds = [...text.matchAll(/\b(\d{2}\/\d{2}\/\d{4})\b/g)].map((m) => m[1]);
    if (!inFees && ds.length >= 2 && !/^W-?\d/i.test(r[0])) {
      periods = [];
      for (let i = 0; i + 1 < ds.length; i += 2) periods.push(periodLabel(ds[i], ds[i + 1]));
      continue;
    }
    const tm = r[0].match(/^W-?(\d)$/i);
    if (!tm) continue;
    const tariff = `W-${tm[1]}`;
    if (inFees) {
      const vals = r.slice(1).map(num);
      const firstIdx = vals.findIndex((v) => v != null);
      // kolumny: WS-D1 (e-faktura), WS-D2 (faktura papierowa), WR (W-5, W-6 – bez względu na fakturę)
      fees.set(tariff, { eFaktura: firstIdx >= 0 ? vals[firstIdx] : null, papier: firstIdx === 0 ? vals[1] ?? null : null });
      continue;
    }
    let k = 0;
    for (let i = 1; i < r.length; i++) {
      const price = num(r[i]);
      if (price == null) continue;
      const code = r[i + 1] && /^G-[\w-]+$/.test(r[i + 1]) ? r[i + 1] : null;
      const per = periods[k++];
      if (!per) {
        warnings.push(`Taryfa ${tariff}: cena ${r[i]} bez okresu dostawy – pominięta.`);
        continue;
      }
      items.push({ media: "GAZ", product: "Stała cena", tariff, zone: null, period: per.period, year: per.year, price, priceMax: null, tradeFee: null, code, note: "cena minimalna" });
    }
  }
  for (const it of items) {
    const f = fees.get(it.tariff);
    if (!f) continue;
    it.tradeFee = f.eFaktura;
    if (f.papier != null) it.note = `cena minimalna; opłata handlowa przy fakturze papierowej: ${String(f.papier).replace(".", ",")} zł/mies.`;
  }
  return {
    format: "AUDAX_GAZ",
    supplier: "Audax Renewables",
    number,
    media: "GAZ",
    validFrom: dates[0] ?? null,
    validTo: dates[1] ?? null,
    items,
    conditions: conditions(rows),
    warnings,
  };
}

/* -------------------------------------------------------------------- Enefit – FIX */

const TARIFF = /^(C\d{2}[AB]?|B\d{2}|G\d{2}[ABW]?|W-?\d+(?:\.\d+)?)$/i;

/** PDF potrafi rozbić „W-3.6” na „W”, „-”, „3.6” – sklejamy z powrotem. */
function mergeSplitTariffs(r: Row): Row {
  const out: Row = [];
  for (let i = 0; i < r.length; i++) {
    if (/^W$/i.test(r[i]) && r[i + 1] === "-" && /^\d+(\.\d+)?$/.test(r[i + 2] ?? "")) {
      out.push(`W-${r[i + 2]}`);
      i += 2;
    } else if (/^W-$/i.test(r[i]) && /^\d+(\.\d+)?$/.test(r[i + 1] ?? "")) {
      out.push(`W-${r[i + 1]}`);
      i += 1;
    } else out.push(r[i]);
  }
  return out;
}

/** Liczba stref taryfy prądu: druga cyfra kodu (C11 → 1, C12A → 2, C23 → 3); gaz – zawsze 1. */
function zonesOf(t: string): number {
  const m = t.match(/^[CBG]\d(\d)/i);
  return m ? Math.max(1, Math.min(3, Number(m[1]))) : 1;
}
const ZONE_NAMES = ["Strefa I", "Strefa II", "Strefa III"];

function parseEnefit(rows: Row[]): ImportResult {
  const warnings: string[] = [];
  const all = rows.map((r) => r.join(""));
  const dm = all.map((t) => t.match(/Cennik(?:cenminimalnych)?(?:obowiązujeod|\s*)?(\d{4})\/(\d{2})\/(\d{2})/i) || t.match(/od(\d{4})\/(\d{2})\/(\d{2})/)).find(Boolean);
  const validFrom = dm ? plDate(dm[3], dm[2], dm[1]) : null;
  const number = dm ? `${dm[1]}/${dm[2]}/${dm[3]}` : null;

  type Cell = { price: number; priceMax: number | null; tradeFee: number | null };
  const map = new Map<string, Cell & { tariff: string; zone: string | null; year: string }>();
  let section: "min" | "max" = "min";
  let tariffs: string[] = [];
  let flat = false;
  let lastKeys: string[][] = []; // klucze komórek bieżącej tabeli (po taryfach) – do przypisania opłaty handlowej
  let awaitingFee = false;

  for (const raw of rows) {
    const r = mergeSplitTariffs(raw);
    const text = r.join(" ");
    const joined = r.join("");
    if (/maksymalnych/i.test(joined)) section = "max";
    else if (/minimalnych/i.test(joined)) section = "min";

    const cells = r.filter((c) => !/^(Taryfa|Rok\s*\\?|\\)$/i.test(c));
    if (cells.length && cells.every((c) => TARIFF.test(c))) {
      tariffs = cells.map((c) => c.toUpperCase().replace(/^W(\d)/, "W-$1"));
      flat = false;
      lastKeys = [];
      awaitingFee = false;
      continue;
    }
    if (/Płaska/i.test(text)) flat = true;

    if (/^20\d{2}$/.test(r[0]) && tariffs.length) {
      const year = r[0];
      const vals = r.slice(1).map(num).filter((v): v is number => v != null);
      const cols: { tariff: string; zone: string | null }[] = [];
      for (const t of tariffs) {
        const z = flat ? 1 : zonesOf(t);
        for (let i = 0; i < z; i++) cols.push({ tariff: t, zone: flat ? "Płaska" : t.startsWith("W") ? null : ZONE_NAMES[i] });
      }
      if (vals.length !== cols.length) {
        warnings.push(`Rok ${year} (${tariffs.join(", ")}): ${vals.length} cen zamiast ${cols.length} – tabela pominięta.`);
        continue;
      }
      const keysByTariff = tariffs.map(() => [] as string[]);
      cols.forEach((c, i) => {
        const key = `${c.tariff}|${c.zone ?? ""}|${year}`;
        const cur = map.get(key);
        if (section === "min") map.set(key, { tariff: c.tariff, zone: c.zone, year, price: vals[i], priceMax: cur?.priceMax ?? null, tradeFee: cur?.tradeFee ?? null });
        else if (cur) cur.priceMax = vals[i];
        else map.set(key, { tariff: c.tariff, zone: c.zone, year, price: vals[i], priceMax: vals[i], tradeFee: null });
        keysByTariff[tariffs.indexOf(c.tariff)].push(key);
      });
      lastKeys = lastKeys.length ? lastKeys.map((k, i) => [...k, ...keysByTariff[i]]) : keysByTariff;
      continue;
    }

    if (/Opłata/i.test(text)) awaitingFee = true;
    const ints = r.filter((c) => !/^(Opłata|Handlowa|Opłata Handlowa)$/i.test(c)).map(num);
    if (awaitingFee && tariffs.length && ints.length === tariffs.length && ints.every((v) => v != null)) {
      if (section === "min")
        lastKeys.forEach((keys, i) => keys.forEach((k) => {
          const c = map.get(k);
          if (c) c.tradeFee = ints[i];
        }));
      awaitingFee = false;
    }
  }

  const items: ImportItem[] = [...map.values()].map((c) => ({
    media: c.tariff.startsWith("W") ? "GAZ" : "PRAD",
    product: "Stała cena (FIX)",
    tariff: c.tariff,
    zone: c.zone,
    period: `01.01.${c.year}–31.12.${c.year}`,
    year: c.year,
    price: c.price,
    priceMax: c.priceMax,
    tradeFee: c.tradeFee,
    code: null,
    note: null,
  }));
  const medias = new Set(items.map((i) => i.media));
  return {
    format: "ENEFIT_FIX",
    supplier: "Enefit",
    number,
    media: medias.size === 1 ? [...medias][0] : null,
    validFrom,
    validTo: null,
    items,
    conditions: conditions(rows),
    warnings,
  };
}

/* -------------------------------------------------------------------- wejście */

export function parseRows(rows: Row[]): ImportResult {
  const text = rows.map((r) => r.join(" ")).join("\n");
  if (/Audax/i.test(text) || (/Cennik nr/i.test(text) && /\bW\d{3}Y\d{2}B2B\b/.test(text))) return parseAudax(rows);
  if (/Enefit/i.test(text)) return parseEnefit(rows);
  throw new ImportError("Nie rozpoznano formatu cennika. Obsługiwane: Audax (gaz) i Enefit (FIX prąd i gaz). Inne cenniki dodaj, wklejając tabelę.");
}

export async function importPriceFile(buf: Uint8Array): Promise<ImportResult> {
  const rows = await fileToRows(buf);
  if (!rows.length) throw new ImportError("Plik nie zawiera tekstu (może to skan?). Dodaj cennik, wklejając tabelę.");
  const res = parseRows(rows);
  if (!res.items.length) throw new ImportError("Nie znaleziono cen w pliku. Sprawdź, czy to właściwy cennik.");
  return res;
}
