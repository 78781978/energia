import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

/** Kopia danych klienta (RODO, art. 15 i 20) w formacie JSON – bez haseł i sekretów. */
export async function GET() {
  const user = await getCurrentUser();
  if (!user || user.role !== "CLIENT") return new NextResponse("Brak dostępu", { status: 401 });
  const me = await db.user.findUniqueOrThrow({
    where: { id: user.id },
    select: {
      email: true, name: true, phone: true, marketingConsent: true, smsConsent: true, newsletterConsent: true, consentsUpdatedAt: true,
      emailVerifiedAt: true, totpEnabledAt: true, createdAt: true, lastLoginAt: true,
      companies: { include: { points: true } },
      applications: {
        include: {
          statusChanges: { select: { fromStatus: true, toStatus: true, comment: true, createdAt: true } },
          offers: { include: { offer: { select: { name: true, supplier: true, priceModel: true, priceNetMWh: true, years: true } } } },
          documents: { where: { visibleToClient: true }, select: { kind: true, fileName: true, createdAt: true } },
        },
      },
      messages: { select: { body: true, createdAt: true, readAt: true } },
    },
  });
  return new NextResponse(JSON.stringify({ exportedAt: new Date().toISOString(), account: me }, null, 2), {
    headers: { "Content-Type": "application/json; charset=utf-8", "Content-Disposition": 'attachment; filename="moje-dane-energia-online.json"', "Cache-Control": "private, no-store" },
  });
}
