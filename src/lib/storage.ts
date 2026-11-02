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

export type StoredFile = { storedName: string; fileName: string; mimeType: string; size: number };

export async function saveUpload(file: File, opts: { pdfOnly?: boolean } = {}): Promise<StoredFile> {
  if (!file || file.size === 0) throw new UploadError("Nie wybrano pliku.");
  if (file.size > MAX_UPLOAD_BYTES) throw new UploadError("Plik jest za duży. Maksymalny rozmiar to 10 MB.");
  const buf = Buffer.from(await file.arrayBuffer());
  const mime = sniff(buf);
  if (!mime || !ALLOWED_UPLOAD_TYPES[mime]) throw new UploadError("Dozwolone formaty: PDF, JPG, PNG.");
  if (opts.pdfOnly && mime !== "application/pdf") throw new UploadError("Prześlij dokument w formacie PDF.");
  const storedName = `${new Date().toISOString().slice(0, 7)}/${randomBytes(16).toString("hex")}.${ALLOWED_UPLOAD_TYPES[mime]}`;
  const full = path.join(ROOT, storedName);
  await mkdir(path.dirname(full), { recursive: true });
  await writeFile(full, buf);
  const fileName = (file.name || "dokument").replace(/[^\p{L}\p{N}._ -]/gu, "_").slice(0, 120);
  return { storedName, fileName, mimeType: mime, size: buf.length };
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
