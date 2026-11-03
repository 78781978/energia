import { NextResponse } from "next/server";
import { adminTwoFactorRequired, getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { readStored } from "@/lib/storage";

export const dynamic = "force-dynamic";

/** Pobieranie dokumentów – tylko dla właściciela (dokumenty widoczne dla klienta) lub administratora. */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return new NextResponse("Brak dostępu", { status: 401 });
  const { id } = await params;
  const doc = await db.document.findUnique({
    where: { id },
    include: { application: { select: { userId: true } }, company: { select: { ownerId: true } }, offers: { select: { id: true } } },
  });
  if (!doc) return new NextResponse("Nie znaleziono", { status: 404 });

  const isAdmin = user.role === "ADMIN" && (user.twoFactor || !adminTwoFactorRequired());
  let allowed = isAdmin;
  if (!allowed && doc.visibleToClient) {
    if (doc.application?.userId === user.id || doc.company?.ownerId === user.id) allowed = true;
    // Cennik oferty przypisanej do wniosku klienta
    if (!allowed && doc.offers.length) {
      const asg = await db.offerAssignment.count({ where: { offerId: { in: doc.offers.map((o) => o.id) }, application: { userId: user.id } } });
      allowed = asg > 0;
    }
  }
  if (!allowed) return new NextResponse("Brak dostępu", { status: 403 });

  const buf = await readStored(doc.storedName);
  const inline = new URL(req.url).searchParams.get("podglad") === "1" && doc.mimeType === "application/pdf";
  return new NextResponse(new Uint8Array(buf), {
    headers: {
      "Content-Type": doc.mimeType,
      "Content-Length": String(buf.length),
      "Content-Disposition": `${inline ? "inline" : "attachment"}; filename*=UTF-8''${encodeURIComponent(doc.fileName)}`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
