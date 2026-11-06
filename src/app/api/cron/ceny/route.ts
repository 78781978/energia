import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { syncMarketPrices } from "@/lib/prices";

export const dynamic = "force-dynamic";

/** Pobranie cen rynkowych z PSE z harmonogramu zadań na hostingu (nagłówek Authorization: Bearer CRON_SECRET). */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  const given = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? new URL(req.url).searchParams.get("klucz") ?? "";
  const a = Buffer.from(given);
  const b = Buffer.from(secret ?? "");
  if (!secret || a.length !== b.length || !timingSafeEqual(a, b)) return new NextResponse("Brak dostępu", { status: 401 });
  const r = await syncMarketPrices(14);
  return NextResponse.json(r);
}
