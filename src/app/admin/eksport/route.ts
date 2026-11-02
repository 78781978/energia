import type { Prisma } from "@prisma/client";
import { getCurrentUser } from "@/lib/auth";
import { ci, db } from "@/lib/db";
import { ADMIN_VIEWS, APP_STATUSES, MEDIA, PRICE_MODELS, STATUS_LABEL, type AppStatus } from "@/lib/constants";

export const dynamic = "force-dynamic";

const cell = (v: unknown) => {
  const s = v == null ? "" : String(v);
  // ochrona przed wstrzykiwaniem formuł w arkuszach
  const safe = /^[=+\-@]/.test(s) ? `'${s}` : s;
  return `"${safe.replace(/"/g, '""')}"`;
};

export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") return new Response("Brak dostępu", { status: 403 });
  const sp = new URL(req.url).searchParams;
  const where: Prisma.ApplicationWhereInput = {};
  const view = ADMIN_VIEWS.find((v) => v.key === sp.get("widok"));
  if (view?.statuses) where.status = { in: view.statuses };
  const st = sp.get("status");
  if (st && (APP_STATUSES as readonly string[]).includes(st)) where.status = st;
  const q = sp.get("q")?.trim();
  if (q) where.OR = [{ company: { name: ci(q) } }, { company: { nip: { contains: q.replace(/\D/g, "") || q } } }, { number: { contains: q } }];

  const apps = await db.application.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: { company: true, user: { select: { email: true, source: true } }, points: { include: { point: true } } },
  });
  const header = ["Numer", "Data", "Status", "Firma", "NIP", "Kontakt", "Telefon", "E-mail", "Media", "Model ceny", "Lata", "Taryfa", "Zużycie MWh", "Liczba PPE", "PPE", "Prośba o telefon", "Źródło"];
  const rows = apps.map((a) => [
    a.number,
    a.createdAt.toISOString().slice(0, 10),
    STATUS_LABEL[a.status as AppStatus] ?? a.status,
    a.company.name,
    a.company.nip,
    a.company.contactName,
    a.company.contactPhone,
    a.company.contactEmail ?? a.user.email,
    MEDIA[a.media as keyof typeof MEDIA],
    PRICE_MODELS[a.priceModel as keyof typeof PRICE_MODELS]?.label,
    a.years,
    a.tariff,
    a.annualUsageMWh,
    a.points.length,
    a.points.map((p) => p.point.ppeNumber).filter(Boolean).join(" "),
    a.wantsCall ? "tak" : "nie",
    a.source ?? a.user.source,
  ]);
  const csv = "﻿" + [header, ...rows].map((r) => r.map(cell).join(";")).join("\r\n");
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="wnioski-${new Date().toISOString().slice(0, 10)}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
