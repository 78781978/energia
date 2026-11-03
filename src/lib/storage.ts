import "server-only";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomBytes } from "node:crypto";
import { ALLOWED_UPLOAD_TYPES, MAX_UPLOAD_BYTES } from "./constants";

const ROOT = path.resolve(process.env.STORAGE_DIR || "./storage");

export class UploadError extends Error {}

/** Sprawdza sygnaturę pliku (magic bytes), a nie tylko deklarowany typ MIME. */
function sniff(buf: Buffer): string | null {
  if (buf.subarray(0, 5).toString("latin1") === "%PDF-") return "application/pdf";
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
  if (buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "image/png";
  return null;
}

/** Faktura ustrukturyzowana z KSeF (XML). Akceptujemy tylko dokumenty XML, przechowujemy je i wydajemy wyłącznie jako załącznik. */
function sniffXml(buf: Buffer): boolean {
  const head = buf.subarray(0, 300).toString("utf8").replace(/^\uFEFF/, "").trimStart();
  return head.startsWith("<?xml") || /^<([A-Za-z_][\w.-]*:)?Faktura[\s>]/.test(head);
}

export type StoredFile = { storedName: string; fileName: string; mimeType: string; size: number };

export async function saveUpload(file: File, opts: { pdfOnly?: boolean; allowXml?: boolean } = {}): Promise<StoredFile> {
  if (!file || file.size === 0) throw new UploadError("Nie wybrano pliku.");
  if (file.size > MAX_UPLOAD_BYTES) throw new UploadError("Plik jest za duży. Maksymalny rozmiar to 10 MB.");
  const buf = Buffer.from(await file.arrayBuffer());
  const mime = sniff(buf) ?? (opts.allowXml && sniffXml(buf) ? "application/xml" : null);
  if (!mime || !ALLOWED_UPLOAD_TYPES[mime]) throw new UploadError(opts.allowXml ? "Dozwolone formaty: PDF, XML (KSeF), JPG, PNG." : "Dozwolone formaty: PDF, JPG, PNG.");
  if (opts.pdfOnly && mime !== "application/pdf") throw new UploadError("Prześlij dokument w formacie PDF.");
  const storedName = `${new Date().toISOString().slice(0, 7)}/${randomBytes(16).toString("hex")}.${ALLOWED_UPLOAD_TYPES[mime]}`;
  const full = path.join(ROOT, storedName);
  await mkdir(path.dirname(full), { recursive: true, mode: 0o750 });
  await writeFile(full, buf, { mode: 0o640 });
  const fileName = (file.name || "dokument").replace(/[^\p{L}\p{N}._ -]/gu, "_").slice(0, 120);
  return { storedName, fileName, mimeType: mime, size: buf.length };
}

/* ---------------------------------------------------------------- obrazy publiczne (CMS) */

const IMAGE_EXT: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

function sniffImage(buf: Buffer): string | null {
  const m = sniff(buf);
  if (m === "image/jpeg" || m === "image/png") return m;
  if (buf.subarray(0, 4).toString("latin1") === "RIFF" && buf.subarray(8, 12).toString("latin1") === "WEBP") return "image/webp";
  return null;
}

/** Odczyt wymiarów obrazu z nagłówka (JPEG, PNG, WebP) – bez dodatkowych bibliotek. */
export function imageSize(buf: Buffer): { width: number; height: number } | null {
  if (buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])))
    return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
  if (buf[0] === 0xff && buf[1] === 0xd8) {
    let i = 2;
    while (i < buf.length - 9) {
      if (buf[i] !== 0xff) {
        i++;
        continue;
      }
      const marker = buf[i + 1];
      const len = buf.readUInt16BE(i + 2);
      if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc)
        return { height: buf.readUInt16BE(i + 5), width: buf.readUInt16BE(i + 7) };
      i += 2 + len;
    }
    return null;
  }
  if (buf.subarray(8, 12).toString("latin1") === "WEBP") {
    const chunk = buf.subarray(12, 16).toString("latin1");
    if (chunk === "VP8 ") return { width: buf.readUInt16LE(26) & 0x3fff, height: buf.readUInt16LE(28) & 0x3fff };
    if (chunk === "VP8L") {
      const b = buf.readUInt32LE(21);
      return { width: (b & 0x3fff) + 1, height: ((b >> 14) & 0x3fff) + 1 };
    }
    if (chunk === "VP8X") return { width: buf.readUIntLE(24, 3) + 1, height: buf.readUIntLE(27, 3) + 1 };
  }
  return null;
}

export type StoredImage = StoredFile & { width: number | null; height: number | null };

/** Zapis obrazu do katalogu `media/` (serwowany publicznie przez /media/…). Maks. 10 MB, JPG/PNG/WebP. */
export async function saveImage(file: File): Promise<StoredImage> {
  if (!file || file.size === 0) throw new UploadError("Nie wybrano obrazu.");
  if (file.size > MAX_UPLOAD_BYTES) throw new UploadError("Obraz jest za duży. Maksymalny rozmiar to 10 MB.");
  const buf = Buffer.from(await file.arrayBuffer());
  const mime = sniffImage(buf);
  if (!mime) throw new UploadError("Dozwolone formaty obrazów: JPG, PNG, WebP.");
  const dims = imageSize(buf);
  const storedName = `media/${randomBytes(12).toString("hex")}.${IMAGE_EXT[mime]}`;
  const full = path.join(ROOT, storedName);
  await mkdir(path.dirname(full), { recursive: true });
  await writeFile(full, buf);
  const fileName = (file.name || "obraz").replace(/[^\p{L}\p{N}._ -]/gu, "_").slice(0, 120);
  return { storedName, fileName, mimeType: mime, size: buf.length, width: dims?.width ?? null, height: dims?.height ?? null };
}

/** Publiczny adres wgranego obrazu. */
export function mediaUrl(storedName: string): string {
  return "/" + storedName; // storedName zaczyna się od "media/"
}

export async function readStored(storedName: string): Promise<Buffer> {
  const full = path.join(ROOT, storedName);
  if (!full.startsWith(ROOT + path.sep)) throw new Error("Nieprawidłowa ścieżka");
  return readFile(full);
}

export async function removeStored(storedName: string): Promise<void> {
  const full = path.join(ROOT, storedName);
  if (!full.startsWith(ROOT + path.sep)) return;
  await unlink(full).catch(() => undefined);
}
