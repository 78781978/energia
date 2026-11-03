/** Walidacja polskich identyfikatorów i pól formularzy. */

export function normalizeDigits(v: string | null | undefined): string {
  return (v ?? "").replace(/\D/g, "");
}

/** NIP – 10 cyfr z sumą kontrolną. */
export function isValidNip(value: string): boolean {
  const nip = normalizeDigits(value);
  if (nip.length !== 10) return false;
  const w = [6, 5, 7, 2, 3, 4, 5, 6, 7];
  const sum = w.reduce((acc, wi, i) => acc + wi * Number(nip[i]), 0);
  const ctrl = sum % 11;
  return ctrl !== 10 && ctrl === Number(nip[9]);
}

/** REGON – 9 lub 14 cyfr z sumą kontrolną. */
export function isValidRegon(value: string): boolean {
  const r = normalizeDigits(value);
  if (r.length === 9) {
    const w = [8, 9, 2, 3, 4, 5, 6, 7];
    const s = w.reduce((a, wi, i) => a + wi * Number(r[i]), 0) % 11;
    return (s === 10 ? 0 : s) === Number(r[8]);
  }
  if (r.length === 14) {
    const w = [2, 4, 8, 5, 0, 9, 7, 3, 6, 1, 2, 4, 8];
    const s = w.reduce((a, wi, i) => a + wi * Number(r[i]), 0) % 11;
    return (s === 10 ? 0 : s) === Number(r[13]);
  }
  return false;
}

/** Numer PPE – w Polsce najczęściej 18 znaków (PL + 16 cyfr lub 18 cyfr); dopuszczamy 10–40 znaków alfanumerycznych. */
export function isPlausiblePpe(value: string): boolean {
  const v = value.replace(/[\s-]/g, "");
  return /^[A-Z0-9]{10,40}$/i.test(v);
}

export function isValidPostalCode(v: string): boolean {
  return /^\d{2}-\d{3}$/.test(v.trim());
}

export function isValidPhone(v: string): boolean {
  const d = normalizeDigits(v);
  return d.length >= 9 && d.length <= 15;
}

export function isValidEmail(v: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim());
}

export function parseNumber(v: FormDataEntryValue | null): number | null {
  if (v == null) return null;
  const s = String(v).replace(/\s/g, "").replace(",", ".");
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

export function str(v: FormDataEntryValue | null, max = 500): string {
  return (typeof v === "string" ? v : "").trim().slice(0, max);
}

export function formatNip(v: string): string {
  const d = normalizeDigits(v);
  return d.length === 10 ? `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6, 8)}-${d.slice(8)}` : v;
}

export const PASSWORD_MIN = 10;
export function passwordProblem(pw: string): string | null {
  if (pw.length < PASSWORD_MIN) return `Hasło musi mieć co najmniej ${PASSWORD_MIN} znaków.`;
  if (!/[a-ząćęłńóśźż]/i.test(pw) || !/\d/.test(pw)) return "Hasło musi zawierać litery i cyfry.";
  return null;
}

/** „Prąd dla firm – 2027!” → „prad-dla-firm-2027” */
export function slugify(text: string): string {
  const map: Record<string, string> = { ą: "a", ć: "c", ę: "e", ł: "l", ń: "n", ó: "o", ś: "s", ź: "z", ż: "z" };
  return text
    .toLowerCase()
    .replace(/[ąćęłńóśźż]/g, (c) => map[c] ?? c)
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}
