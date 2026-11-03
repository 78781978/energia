import "server-only";
import net from "node:net";
import { createHash } from "node:crypto";
import { constants as zlibConstants, inflateSync } from "node:zlib";

/**
 * Kontrola bezpieczeństwa przesyłanych plików (faktury, umowy, logo, obrazy w panelu).
 *
 * 1. Zawsze – wbudowana analiza zawartości (działa na każdym hostingu, bez dodatkowych programów):
 *    - PDF: odrzucamy pliki z aktywną zawartością (JavaScript, uruchamianie programów, osadzone pliki,
 *      Flash/RichMedia, formularze XFA, wysyłanie danych) – także ukrytą w skompresowanych strumieniach
 *      i zapisaną kodami #xx; faktury i umowy tego nie zawierają,
 *    - XML: odrzucamy DOCTYPE/ENTITY (ataki XXE i „billion laughs”),
 *    - wszystkie pliki: sygnatura testowa EICAR (sprawdzenie działania ochrony).
 * 2. Opcjonalnie – antywirus ClamAV (clamd), jeśli jest dostępny: CLAMAV_HOST="host:port" lub CLAMAV_SOCKET="/ścieżka/clamd.sock".
 *    CLAMAV_REQUIRED=1 – gdy antywirus nie odpowiada, plik jest odrzucany (domyślnie: przyjmowany z wpisem w logu).
 */
export class FileRejected extends Error {}

const PDF_ACTIVE = ["JavaScript", "JS", "Launch", "EmbeddedFile", "EmbeddedFiles", "RichMedia", "XFA", "ImportData", "SubmitForm", "GoToE"];
const EICAR = "X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*";

/** Rozkodowanie nazw PDF zapisanych kodami szesnastkowymi, np. /J#61vaScript → /JavaScript */
function decodePdfNames(s: string): string {
  return s.replace(/\/[A-Za-z0-9#._-]+/g, (t) => (t.includes("#") ? t.replace(/#([0-9A-Fa-f]{2})/g, (_, h) => String.fromCharCode(parseInt(h, 16))) : t));
}

function pdfActiveContent(buf: Buffer): string | null {
  const parts: string[] = [buf.toString("latin1")];
  // rozpakuj strumienie (obiekty mogą być ukryte w skompresowanych /ObjStm)
  const raw = parts[0];
  const re = /(?<!end)stream\r?\n/g;
  let m: RegExpExecArray | null;
  let total = 0;
  let count = 0;
  while ((m = re.exec(raw)) && count < 400 && total < 40e6) {
    const start = m.index + m[0].length;
    const end = raw.indexOf("endstream", start);
    if (end < 0) break;
    count++;
    try {
      const out = inflateSync(buf.subarray(start, end), { maxOutputLength: 8e6, finishFlush: zlibConstants.Z_SYNC_FLUSH });
      total += out.length;
      parts.push(out.toString("latin1"));
    } catch {
      /* strumień nieskompresowany lub w innym formacie (np. obraz) */
    }
    re.lastIndex = end + 9;
  }
  const text = decodePdfNames(parts.join("\n"));
  for (const key of PDF_ACTIVE) if (new RegExp(`/${key}(?![A-Za-z0-9])`).test(text)) return key;
  return null;
}

function clamScan(buf: Buffer): Promise<{ ok: boolean; result: string }> {
  return new Promise((resolve, reject) => {
    const host = process.env.CLAMAV_HOST;
    const sock = process.env.CLAMAV_SOCKET;
    const [h, p] = (host ?? "").split(":");
    const conn = sock ? net.createConnection(sock) : net.createConnection(Number(p || 3310), h || "127.0.0.1");
    let reply = "";
    conn.setTimeout(20000, () => {
      conn.destroy();
      reject(new Error("przekroczono czas odpowiedzi antywirusa"));
    });
    conn.on("error", reject);
    conn.on("data", (d) => (reply += d.toString()));
    conn.on("end", () => {
      const r = reply.replace(/\0/g, "").trim();
      if (/OK$/.test(r)) resolve({ ok: true, result: r });
      else if (/FOUND$/.test(r)) resolve({ ok: false, result: r.replace(/^stream:\s*/, "").replace(/\s*FOUND$/, "") });
      else reject(new Error(`nieoczekiwana odpowiedź: ${r || "brak"}`));
    });
    conn.on("connect", () => {
      conn.write("zINSTREAM\0");
      for (let i = 0; i < buf.length; i += 64 * 1024) {
        const chunk = buf.subarray(i, i + 64 * 1024);
        const len = Buffer.alloc(4);
        len.writeUInt32BE(chunk.length);
        conn.write(len);
        conn.write(chunk);
      }
      conn.write(Buffer.alloc(4)); // koniec strumienia
    });
  });
}

export function antivirusConfigured(): boolean {
  return Boolean(process.env.CLAMAV_HOST || process.env.CLAMAV_SOCKET);
}

/** Sprawdza plik; rzuca FileRejected z opisem dla użytkownika, gdy plik jest niebezpieczny. */
export async function scanFile(buf: Buffer, mime: string, fileName = "plik"): Promise<void> {
  const sha = createHash("sha256").update(buf).digest("hex").slice(0, 16);
  const reject = (why: string, user: string) => {
    console.warn(`[kontrola-plikow] odrzucono ${fileName} (${mime}, sha256 ${sha}…): ${why}`);
    throw new FileRejected(user);
  };
  if (buf.includes(EICAR)) reject("sygnatura EICAR", "Plik został odrzucony przez kontrolę antywirusową.");
  if (mime === "application/pdf") {
    const key = pdfActiveContent(buf);
    if (key)
      reject(
        `aktywna zawartość PDF /${key}`,
        "Plik PDF zawiera aktywną zawartość (np. skrypt lub osadzony plik) i został odrzucony ze względów bezpieczeństwa. Zapisz dokument ponownie jako zwykły PDF („Drukuj → Zapisz jako PDF”) i prześlij jeszcze raz.",
      );
  }
  if (mime === "application/xml" && /<!DOCTYPE|<!ENTITY/i.test(buf.subarray(0, 200000).toString("utf8")))
    reject("XML z DOCTYPE/ENTITY", "Plik XML zawiera niedozwolone deklaracje (DOCTYPE). Prześlij oryginalny plik faktury z KSeF.");
  if (antivirusConfigured()) {
    try {
      const r = await clamScan(buf);
      if (!r.ok) reject(`ClamAV: ${r.result}`, "Plik został odrzucony przez program antywirusowy.");
    } catch (e) {
      if (e instanceof FileRejected) throw e;
      console.error(`[kontrola-plikow] antywirus niedostępny (${(e as Error).message}) – plik ${fileName}`);
      if (process.env.CLAMAV_REQUIRED === "1") throw new FileRejected("Nie udało się sprawdzić pliku programem antywirusowym. Spróbuj ponownie za kilka minut.");
    }
  }
}
