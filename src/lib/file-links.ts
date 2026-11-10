import { createHmac, timingSafeEqual } from "node:crypto";
import { SITE } from "./site";

/**
 * Podpisane, krótkotrwałe linki do dokumentów dla systemów zewnętrznych (Livespace pobiera faktury z tego linku).
 * Link otwiera jeden konkretny plik i wygasa po `ttlMin` minutach. Klucz: FILE_LINK_SECRET albo (pochodny) LIVESPACE_API_SECRET.
 */
function key(): string | null {
  const base = process.env.FILE_LINK_SECRET || process.env.LIVESPACE_API_SECRET || "";
  if (base.length < 16) return null;
  return createHmac("sha256", base).update("energia:pliki-crm:v1").digest("hex");
}

const sign = (k: string, id: string, exp: number) => createHmac("sha256", k).update(`${id}.${exp}`).digest("base64url");

export function signedFileUrl(documentId: string, ttlMin = 60): string | null {
  const k = key();
  if (!k) return null;
  const exp = Math.floor(Date.now() / 1000) + ttlMin * 60;
  return `${SITE.url}/api/crm-plik/${encodeURIComponent(documentId)}/?exp=${exp}&sig=${sign(k, documentId, exp)}`;
}

export function verifyFileLink(documentId: string, exp: string | null, sig: string | null): boolean {
  const k = key();
  if (!k || !exp || !sig || !/^\d{10}$/.test(exp)) return false;
  if (Number(exp) < Date.now() / 1000) return false;
  const a = Buffer.from(sign(k, documentId, Number(exp)));
  const b = Buffer.from(sig);
  return a.length === b.length && timingSafeEqual(a, b);
}
