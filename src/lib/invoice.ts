import "server-only";
import { XMLParser } from "fast-xml-parser";
import { isValidNip, normalizeDigits } from "./validators";

/**
 * Odczyt danych z faktury za energię lub gaz – bez zewnętrznych usług:
 * - faktury z KSeF (plik XML, schemat FA) – dane nabywcy z pól strukturalnych, reszta z treści,
 * - faktury PDF z warstwą tekstową (większość faktur wysyłanych e-mailem) – rozpoznawanie wzorców.
 * Skany (zdjęcia faktur) wymagają usługi OCR – zob. BRAKI.md, etap C.
 */
export type InvoiceData = {
  source: "KSEF_XML" | "PDF_TEXT" | "NONE";
  medium: "PRAD" | "GAZ" | null;
  ppeNumber: string | null;
  meterNumber: string | null;
  tariff: string | null;
  usageKWh: number | null;
  seller: string | null;
  operator: string | null;
  street: string | null;
  postalCode: string | null;
  city: string | null;
  buyerName: string | null;
  buyerNip: string | null;
  found: number; // liczba odczytanych pól
};

const SELLERS = ["PGE Obrót", "TAURON Sprzedaż", "Enea", "Energa Obrót", "E.ON", "innogy", "Polenergia", "PGNiG", "Orlen", "Fortum", "Axpo", "CEZ", "Lumi", "Respect Energy", "Hermes Energy", "Polkomtel", "Tauron"];
const OPERATORS = ["PGE Dystrybucja", "TAURON Dystrybucja", "Enea Operator", "Energa-Operator", "Energa Operator", "Stoen Operator", "Polska Spółka Gazownictwa", "PSG"];

async function pdfText(buf: Buffer): Promise<string> {
  const { extractText, getDocumentProxy } = await import("unpdf");
  const pdf = await getDocumentProxy(new Uint8Array(buf));
  const { text } = await extractText(pdf, { mergePages: true });
  return Array.isArray(text) ? text.join("\n") : text;
}

function flatten(o: unknown, out: string[] = []): string[] {
  if (o == null) return out;
  if (typeof o === "object") for (const v of Object.values(o as Record<string, unknown>)) flatten(v, out);
  else out.push(String(o));
  return out;
}

function findKey(o: unknown, key: string): unknown {
  if (!o || typeof o !== "object") return undefined;
  for (const [k, v] of Object.entries(o as Record<string, unknown>)) {
    if (k.replace(/^.*:/, "") === key) return v;
    const r = findKey(v, key);
    if (r !== undefined) return r;
  }
  return undefined;
}

const num = (s: string) => Number(s.replace(/\s/g, "").replace(/\.(?=\d{3}\b)/g, "").replace(",", "."));

export function parseInvoiceText(raw: string, base: Partial<InvoiceData> = {}): InvoiceData {
  const text = raw.replace(/ /g, " ").replace(/[ \t]+/g, " ");
  const lower = text.toLowerCase();
  const isGas = /paliw[ao] gazow|gaz ziemny|ppg\b|\bw-?[1-7]\b|polska spółka gazownictwa/i.test(text);
  const isPower = /energi[ai] elektryczn|\bkwh\b.*\b(c1|c2|b2|g1)|\bppe\b/i.test(text);
  const medium: InvoiceData["medium"] = isGas && !isPower ? "GAZ" : isPower ? "PRAD" : isGas ? "GAZ" : null;

  const ppe =
    text.match(/\b(PL[A-Z0-9]{4}\d{12,14})\b/)?.[1] ??
    text.match(/(?:PPE|PPG|punktu poboru|kod PPE|numer PPE|nr PPE)[^0-9A-Z]{0,25}([0-9A-Z]{16,24})/i)?.[1] ??
    text.match(/\b((?:590|801)\d{15,19})\b/)?.[1] ??
    null;
  const meter = text.match(/(?:nr|numer|nr\.)\s*(?:fabryczny\s*)?licznika[:\s]*([A-Z0-9][A-Z0-9\-/]{4,19})/i)?.[1] ?? text.match(/licznik(?:a)?\s*nr[:\s]*([A-Z0-9][A-Z0-9\-/]{4,19})/i)?.[1] ?? null;
  const tariff = text.match(/\b(C1[12][abo]?|C2[12][ab]?|B2[1-3]|G1[12][a-z]?|W-?[1-7](?:\.\d)?)\b/)?.[1]?.replace(/^W(\d)/, "W-$1") ?? null;

  let usage: number | null = null;
  for (const m of text.matchAll(/(\d{1,3}(?:[ .]\d{3})*(?:,\d+)?|\d+(?:,\d+)?)\s*kWh/gi)) {
    const v = num(m[1]);
    if (Number.isFinite(v) && v > 0 && v < 1e8 && (usage == null || v > usage)) usage = v;
  }

  const seller = SELLERS.find((s) => lower.includes(s.toLowerCase())) ?? null;
  const operator = OPERATORS.find((s) => lower.includes(s.toLowerCase())) ?? null;

  // adres punktu poboru
  let street: string | null = null,
    postal: string | null = null,
    city: string | null = null;
  const addr = text.match(/(?:adres (?:punktu poboru|PPE|PPG|obiektu)|miejsce (?:dostarczania|poboru)|punkt poboru)[^:\n]{0,20}[:\s]+([^\n]{5,120})/i)?.[1];
  const addrSrc = addr ?? "";
  const pc = addrSrc.match(/(\d{2}-\d{3})\s+([A-ZĄĆĘŁŃÓŚŹŻ][\p{L} -]{1,40})/u);
  if (pc) {
    postal = pc[1];
    city = pc[2].trim().replace(/\s+(ul|al)\.?$/i, "");
    street = addrSrc.slice(0, addrSrc.indexOf(pc[1])).replace(/[,;]\s*$/, "").trim() || null;
  } else if (addr) street = addr.trim();

  // NIP nabywcy – pierwszy poprawny NIP inny niż sprzedawcy (sprzedawca zwykle pierwszy)
  const nips = [...text.matchAll(/NIP[:\s]*(?:PL)?\s*([0-9][0-9\- ]{9,13})/gi)].map((m) => normalizeDigits(m[1])).filter(isValidNip);
  const buyerNip = base.buyerNip ?? (nips.length > 1 ? nips[1] : nips[0]) ?? null;

  const out: InvoiceData = {
    source: base.source ?? "PDF_TEXT",
    medium,
    ppeNumber: ppe,
    meterNumber: meter,
    tariff,
    usageKWh: usage,
    seller: base.seller ?? seller,
    operator,
    street: base.street ?? street,
    postalCode: base.postalCode ?? postal,
    city: base.city ?? city,
    buyerName: base.buyerName ?? null,
    buyerNip,
    found: 0,
  };
  out.found = [out.ppeNumber, out.meterNumber, out.tariff, out.usageKWh, out.seller, out.operator, out.street, out.buyerNip].filter((x) => x != null).length;
  return out;
}

export async function readInvoice(buf: Buffer): Promise<InvoiceData> {
  const head = buf.subarray(0, 200).toString("utf8").trimStart();
  if (head.startsWith("<?xml") || head.startsWith("<")) {
    const xml = new XMLParser({ ignoreAttributes: true, removeNSPrefix: true }).parse(buf.toString("utf8"));
    const buyer = findKey(xml, "Podmiot2") as Record<string, unknown> | undefined;
    const seller = findKey(xml, "Podmiot1") as Record<string, unknown> | undefined;
    const bName = buyer ? (findKey(buyer, "Nazwa") as string | undefined) : undefined;
    const bNip = buyer ? String(findKey(buyer, "NIP") ?? "") : "";
    const sName = seller ? (findKey(seller, "Nazwa") as string | undefined) : undefined;
    const base: Partial<InvoiceData> = {
      source: "KSEF_XML",
      buyerName: bName ? String(bName) : null,
      buyerNip: isValidNip(bNip) ? normalizeDigits(bNip) : null,
      seller: sName ? String(sName) : null,
    };
    return parseInvoiceText(flatten(xml).join("\n"), base);
  }
  if (buf.subarray(0, 5).toString("latin1") === "%PDF-") {
    const text = await pdfText(buf);
    if (text.replace(/\s/g, "").length < 40) return { ...parseInvoiceText(""), source: "NONE" };
    return parseInvoiceText(text);
  }
  return { ...parseInvoiceText(""), source: "NONE" };
}
