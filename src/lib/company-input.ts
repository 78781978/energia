import "server-only";
import { isPlausiblePpe, isValidEmail, isValidNip, isValidPhone, isValidPostalCode, isValidRegon, normalizeDigits, parseNumber, str } from "./validators";

/* ------------------------------------------------------------ dane firmy */

type CompanyInput = {
  name: string;
  nip: string;
  regon: string | null;
  legalForm: string | null;
  contactName: string | null;
  contactPhone: string | null;
  contactEmail: string | null;
  hqStreet: string | null;
  hqPostalCode: string | null;
  hqCity: string | null;
  corrSameAsHq: boolean;
  corrStreet: string | null;
  corrPostalCode: string | null;
  corrCity: string | null;
};

export function readCompany(fd: FormData, fe: Record<string, string>): CompanyInput {
  const c: CompanyInput = {
    name: str(fd.get("companyName"), 250),
    nip: normalizeDigits(str(fd.get("nip"), 20)),
    regon: normalizeDigits(str(fd.get("regon"), 20)) || null,
    legalForm: str(fd.get("legalForm"), 80) || null,
    contactName: str(fd.get("contactName"), 120) || null,
    contactPhone: str(fd.get("contactPhone"), 30) || null,
    contactEmail: str(fd.get("contactEmail"), 200).toLowerCase() || null,
    hqStreet: str(fd.get("hqStreet"), 200) || null,
    hqPostalCode: str(fd.get("hqPostalCode"), 6) || null,
    hqCity: str(fd.get("hqCity"), 100) || null,
    corrSameAsHq: fd.get("corrDifferent") !== "on",
    corrStreet: str(fd.get("corrStreet"), 200) || null,
    corrPostalCode: str(fd.get("corrPostalCode"), 6) || null,
    corrCity: str(fd.get("corrCity"), 100) || null,
  };
  if (c.name.length < 2) fe.companyName = "Podaj nazwę firmy.";
  if (!isValidNip(c.nip)) fe.nip = "Wpisz poprawny NIP (10 cyfr).";
  if (c.regon && !isValidRegon(c.regon)) fe.regon = "Wpisz poprawny REGON (9 lub 14 cyfr).";
  if (!c.contactName) fe.contactName = "Podaj imię i nazwisko osoby kontaktowej.";
  if (!c.contactPhone || !isValidPhone(c.contactPhone)) fe.contactPhone = "Wpisz poprawny numer telefonu.";
  if (!c.contactEmail || !isValidEmail(c.contactEmail)) fe.contactEmail = "Wpisz poprawny adres e-mail.";
  if (!c.hqStreet) fe.hqStreet = "Podaj ulicę i numer.";
  if (!c.hqPostalCode || !isValidPostalCode(c.hqPostalCode)) fe.hqPostalCode = "Format: 00-000.";
  if (!c.hqCity) fe.hqCity = "Podaj miejscowość.";
  if (!c.corrSameAsHq) {
    if (!c.corrStreet) fe.corrStreet = "Podaj adres korespondencyjny.";
    if (!c.corrPostalCode || !isValidPostalCode(c.corrPostalCode)) fe.corrPostalCode = "Format: 00-000.";
    if (!c.corrCity) fe.corrCity = "Podaj miejscowość.";
  } else {
    c.corrStreet = c.corrPostalCode = c.corrCity = null;
  }
  return c;
}

type PointInput = {
  id?: string;
  medium: "PRAD" | "GAZ";
  name: string | null;
  meterNumber: string | null;
  ppeNumber: string | null;
  street: string | null;
  postalCode: string | null;
  city: string | null;
  currentSeller: string | null;
  operator: string | null;
  tariff: string | null;
  annualUsageMWh: number | null;
  contractedPowerKw: number | null;
  contractEndDate: Date | null;
  noticeDays: number | null;
};

export function readPoints(raw: string, fe: Record<string, string>): PointInput[] {
  let arr: unknown;
  try {
    arr = JSON.parse(raw || "[]");
  } catch {
    arr = [];
  }
  if (!Array.isArray(arr)) return [];
  return arr.slice(0, 50).map((p: Record<string, unknown>, i: number) => {
    const s = (k: string, max = 200) => (typeof p[k] === "string" ? (p[k] as string).trim().slice(0, max) : "") || null;
    const n = (k: string) => {
      const v = parseNumber(typeof p[k] === "string" || typeof p[k] === "number" ? String(p[k]) : null);
      return v != null && v >= 0 && v < 1e7 ? v : null;
    };
    const ppe = s("ppeNumber", 60)?.replace(/\s/g, "") ?? null;
    if (ppe && !isPlausiblePpe(ppe)) fe[`point_${i}_ppeNumber`] = "Numer PPE wygląda na niepoprawny – sprawdź go na fakturze.";
    const postal = s("postalCode", 6);
    if (postal && !isValidPostalCode(postal)) fe[`point_${i}_postalCode`] = "Format: 00-000.";
    const end = s("contractEndDate", 10);
    const endDate = end && /^\d{4}-\d{2}-\d{2}$/.test(end) ? new Date(end) : null;
    return {
      id: s("id", 40) ?? undefined,
      medium: p.medium === "GAZ" ? "GAZ" : "PRAD",
      name: s("name", 120),
      meterNumber: s("meterNumber", 40)?.replace(/\s/g, "") ?? null,
      ppeNumber: ppe,
      street: s("street"),
      postalCode: postal,
      city: s("city", 100),
      currentSeller: s("currentSeller", 120),
      operator: s("operator", 120),
      tariff: s("tariff", 30),
      annualUsageMWh: n("annualUsageMWh"),
      contractedPowerKw: n("contractedPowerKw"),
      contractEndDate: endDate,
      noticeDays: (() => {
        const d = n("noticeDays");
        return d != null && d <= 730 ? Math.round(d) : null;
      })(),
    } satisfies PointInput;
  });
}

