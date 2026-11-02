import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { PageHead, StatusBadge, fmtDate } from "@/components/app/ui";
import { normalizeDigits } from "@/lib/validators";

export const metadata = { title: "Klienci" };

export default async function Clients({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  await requireAdmin();
  const q = ((await searchParams).q ?? "").trim();
  const digits = normalizeDigits(q);
  const where: Prisma.UserWhereInput = { role: "CLIENT" };
  if (q)
    where.OR = [
      { email: { contains: q.toLowerCase() } },
      { name: { contains: q } },
      { companies: { some: { name: { contains: q } } } },
      ...(digits.length >= 3 ? [{ companies: { some: { nip: { contains: digits } } } }] : []),
    ];
  const users = await db.user.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 200,
    include: {
      companies: { select: { name: true, nip: true, _count: { select: { points: true } } } },
      applications: { orderBy: { createdAt: "desc" }, take: 1, select: { id: true, number: true, status: true } },
      _count: { select: { applications: true } },
    },
  });
  return (
    <>
      <PageHead title="Klienci" sub="Baza kont klientów, firm i punktów poboru." />
      <form method="get" className="filters" style={{ gridTemplateColumns: "1fr auto" }}>
        <div className="field">
          <label htmlFor="q">Szukaj (NIP, nazwa firmy, e-mail)</label>
          <input id="q" className="input" name="q" defaultValue={q} />
        </div>
        <button className="btn" type="submit">
          Szukaj
        </button>
      </form>
      <div className="panel">
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Konto</th>
                <th>Firmy</th>
                <th>PPE</th>
                <th>Wnioski</th>
                <th>Ostatni wniosek</th>
                <th>Rejestracja</th>
                <th>Źródło</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td>
                    <Link className="row-link" href={`/admin/klienci/${u.id}/`}>
                      {u.email}
                    </Link>
                    <div className="muted small">
                      {u.name ?? ""} {u.phone ?? ""} {!u.isActive && "· zablokowane"}
                    </div>
                  </td>
                  <td>
                    {u.companies.map((c) => (
                      <div key={c.nip}>
                        {c.name} <span className="muted small">NIP {c.nip}</span>
                      </div>
                    ))}
                    {!u.companies.length && <span className="muted">–</span>}
                  </td>
                  <td>{u.companies.reduce((a, c) => a + c._count.points, 0)}</td>
                  <td>{u._count.applications}</td>
                  <td>
                    {u.applications[0] ? (
                      <Link href={`/admin/wnioski/${u.applications[0].id}/`} style={{ display: "inline-flex", gap: 8, alignItems: "center" }}>
                        {u.applications[0].number} <StatusBadge status={u.applications[0].status} />
                      </Link>
                    ) : (
                      <span className="muted small">bez wniosku</span>
                    )}
                  </td>
                  <td>{fmtDate(u.createdAt)}</td>
                  <td className="small muted">{u.source ?? "–"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!users.length && <p className="muted">Brak klientów.</p>}
      </div>
    </>
  );
}
