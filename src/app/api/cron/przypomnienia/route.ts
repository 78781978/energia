import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { db } from "@/lib/db";
import { sendMail } from "@/lib/mail";
import { sendVerification } from "@/lib/verify";
import { SITE } from "@/lib/site";

export const dynamic = "force-dynamic";

function authorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const url = new URL(req.url);
  const given = url.searchParams.get("klucz") ?? req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  const a = Buffer.from(given);
  const b = Buffer.from(secret);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Zapisuje przypomnienie; false = już było wysłane (unikalność kind + refId). */
async function once(userId: string, kind: string, refId: string): Promise<boolean> {
  try {
    await db.reminderSent.create({ data: { userId, kind, refId } });
    return true;
  } catch {
    return false;
  }
}

/**
 * Przypomnienia e-mail – uruchamiane raz dziennie przez harmonogram zadań (cron) hostingu:
 *   GET /api/cron/przypomnienia/?klucz=CRON_SECRET
 * 1) niepotwierdzony e-mail (po 2 dniach), 2) zbliżający się termin wypowiedzenia (30 i 7 dni),
 * 3) wygasająca oferta (3 dni), 4) umowa czeka na podpis dłużej niż 3 dni.
 */
export async function GET(req: Request) {
  if (!authorized(req)) return new NextResponse("Brak dostępu", { status: 401 });
  // wywołanie automatyczne (co godzinę) – tylko gdy od ostatniego przebiegu minęło ponad 20 godzin
  if (new URL(req.url).searchParams.get("tylko-zalegle") === "1") {
    const last = await db.setting.findUnique({ where: { key: "job:przypomnienia" } });
    const at = last ? Date.parse((JSON.parse(last.value) as { at?: string }).at ?? "") : 0;
    if (at && Date.now() - at < 20 * 3600e3) return NextResponse.json({ ok: true, skipped: true });
  }
  const now = Date.now();
  const stats = { verify: 0, notice: 0, offer: 0, signature: 0 };

  // 1. Niepotwierdzony adres e-mail
  const unverified = await db.user.findMany({
    where: { role: "CLIENT", isActive: true, emailVerifiedAt: null, createdAt: { lt: new Date(now - 2 * 864e5), gt: new Date(now - 30 * 864e5) } },
    select: { id: true, email: true },
  });
  for (const u of unverified) if (await once(u.id, "VERIFY", u.id)) {
    await sendVerification(u.id, u.email);
    stats.verify++;
  }

  // 2. Termin wypowiedzenia umowy
  const points = await db.meteringPoint.findMany({
    where: { contractEndDate: { gt: new Date(now) }, company: { owner: { isActive: true } } },
    include: { company: { select: { ownerId: true, name: true, owner: { select: { email: true } } } } },
  });
  for (const p of points) {
    const notice = new Date(+p.contractEndDate! - (p.noticeDays ?? 30) * 864e5);
    const daysLeft = Math.ceil((+notice - now) / 864e5);
    for (const threshold of [30, 7]) {
      if (daysLeft <= threshold && daysLeft >= 0 && (await once(p.company.ownerId, `NOTICE_${threshold}`, `${p.id}:${p.contractEndDate!.toISOString().slice(0, 10)}`))) {
        await sendMail({
          to: p.company.owner.email,
          subject: `Za ${daysLeft} dni mija termin wypowiedzenia umowy – ${p.name || p.ppeNumber || p.company.name}`,
          text: `Dzień dobry,\n\numowa dla licznika ${p.name ? `„${p.name}” ` : ""}(${p.ppeNumber ?? "bez numeru"}) kończy się ${p.contractEndDate!.toLocaleDateString("pl-PL")}.\nOstatni dzień na wypowiedzenie: ${notice.toLocaleDateString("pl-PL")}.\n\nZłóż zamówienie w generatorze ofert, aby zdążyć ze zmianą warunków:\n${SITE.url}/portal/wniosek/`,
        });
        stats.notice++;
        break;
      }
    }
  }

  // 3. Wygasające oferty (proponowane, ważne krócej niż 3 dni)
  const expiring = await db.offerAssignment.findMany({
    where: { status: "PROPONOWANA", offer: { validUntil: { gt: new Date(now), lt: new Date(now + 3 * 864e5) } }, application: { status: { notIn: ["ODRZUCONA", "AKTYWOWANA"] } } },
    include: { offer: true, application: { include: { user: { select: { id: true, email: true } } } } },
  });
  for (const a of expiring) if (await once(a.application.user.id, "OFFER_EXPIRY", a.id)) {
    await sendMail({
      to: a.application.user.email,
      subject: `Oferta ${a.offer.supplier} wygasa ${a.offer.validUntil!.toLocaleDateString("pl-PL")}`,
      text: `Dzień dobry,\n\npropozycja „${a.offer.name}” (${a.offer.supplier}) do zamówienia ${a.application.number} jest ważna do ${a.offer.validUntil!.toLocaleDateString("pl-PL")}.\n\nSprawdź oferty: ${SITE.url}/portal/wnioski/${a.applicationId}/`,
    });
    stats.offer++;
  }

  // 4. Umowa czeka na podpis > 3 dni
  const waiting = await db.application.findMany({
    where: { status: "OCZEKUJE_NA_PODPIS", updatedAt: { lt: new Date(now - 3 * 864e5) } },
    include: { user: { select: { id: true, email: true } } },
  });
  for (const a of waiting) if (await once(a.user.id, "SIGNATURE", `${a.id}:${a.updatedAt.toISOString().slice(0, 10)}`)) {
    await sendMail({
      to: a.user.email,
      subject: `Umowa czeka na podpis – zamówienie ${a.number}`,
      text: `Dzień dobry,\n\numowa do zamówienia ${a.number} czeka na Twój podpis. Pobierz ją, podpisz i prześlij w portalu:\n${SITE.url}/portal/wnioski/${a.id}/\n\nW razie pytań odpowiedz na tę wiadomość lub zamów rozmowę z doradcą.`,
    });
    stats.signature++;
  }

  const run = JSON.stringify({ at: new Date().toISOString(), sent: stats, by: new URL(req.url).searchParams.get("zrodlo") === "auto" ? "auto" : "cron" });
  await db.setting.upsert({ where: { key: "job:przypomnienia" }, update: { value: run }, create: { key: "job:przypomnienia", value: run } });
  return NextResponse.json({ ok: true, sent: stats });
}
