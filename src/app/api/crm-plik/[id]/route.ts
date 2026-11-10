import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { readStored } from "@/lib/storage";
import { verifyFileLink } from "@/lib/file-links";

export const dynamic = "force-dynamic";

/** Pobranie dokumentu przez system CRM (Livespace) – tylko z ważnym, podpisanym linkiem (1 plik, 1 godzina). */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const url = new URL(req.url);
  if (!verifyFileLink(id, url.searchParams.get("exp"), url.searchParams.get("sig"))) return new NextResponse("Brak dostępu", { status: 403 });
  const doc = await db.document.findUnique({ where: { id } });
  if (!doc) return new NextResponse("Nie znaleziono", { status: 404 });
  const buf = await readStored(doc.storedName);
  return new NextResponse(new Uint8Array(buf), {
    headers: {
      "Content-Type": doc.mimeType,
      "Content-Length": String(buf.length),
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(doc.fileName)}`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
      "X-Robots-Tag": "noindex, nofollow",
    },
  });
}
