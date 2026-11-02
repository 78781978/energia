import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") return new Response("Brak dostępu", { status: 403 });
  const [subs, users] = await Promise.all([
    db.newsletterSubscriber.findMany({ where: { unsubscribedAt: null }, orderBy: { createdAt: "asc" } }),
    db.user.findMany({ where: { role: "CLIENT", marketingConsent: true, isActive: true }, select: { email: true, createdAt: true } }),
  ]);
  const seen = new Set<string>();
  const rows = [["email", "zrodlo", "data_zapisu"]];
  for (const s of subs) if (!seen.has(s.email)) (seen.add(s.email), rows.push([s.email, s.source ?? "newsletter", s.createdAt.toISOString().slice(0, 10)]));
  for (const u of users) if (!seen.has(u.email)) (seen.add(u.email), rows.push([u.email, "portal", u.createdAt.toISOString().slice(0, 10)]));
  const csv = "﻿" + rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(";")).join("\r\n");
  return new Response(csv, {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": 'attachment; filename="newsletter.csv"', "Cache-Control": "no-store" },
  });
}
