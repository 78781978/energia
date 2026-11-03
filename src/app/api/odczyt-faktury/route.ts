import { NextResponse } from "next/server";
import { clientIp, rateLimit } from "@/lib/auth";
import { readInvoice } from "@/lib/invoice";
import { FileRejected, scanFile } from "@/lib/filescan";
import { MAX_UPLOAD_BYTES } from "@/lib/constants";

export const dynamic = "force-dynamic";

/** Odczyt danych z faktury (PDF z tekstem lub XML z KSeF) dla kreatora – plik nie jest zapisywany. */
export async function POST(req: Request) {
  const ip = await clientIp();
  if (!await rateLimit(`invoice:${ip}`, 30, 60 * 60 * 1000)) return NextResponse.json({ error: "Zbyt wiele prób. Spróbuj za chwilę." }, { status: 429 });
  const fd = await req.formData().catch(() => null);
  const file = fd?.get("file");
  if (!(file instanceof File) || file.size === 0) return NextResponse.json({ error: "Brak pliku." }, { status: 400 });
  if (file.size > MAX_UPLOAD_BYTES) return NextResponse.json({ error: "Plik jest za duży (max 10 MB)." }, { status: 400 });
  const buf = Buffer.from(await file.arrayBuffer());
  // kontrola bezpieczeństwa przed analizą pliku
  try {
    await scanFile(buf, buf.subarray(0, 5).toString("latin1") === "%PDF-" ? "application/pdf" : "application/xml", file.name);
  } catch (e) {
    if (e instanceof FileRejected) return NextResponse.json({ error: e.message }, { status: 422 });
    throw e;
  }
  try {
    const data = await readInvoice(buf);
    return NextResponse.json({ data });
  } catch (e) {
    console.error("[odczyt-faktury]", e);
    return NextResponse.json({ error: "Nie udało się odczytać pliku. Wpisz dane ręcznie." }, { status: 422 });
  }
}
