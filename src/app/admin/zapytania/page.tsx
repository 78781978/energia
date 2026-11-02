import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { PageHead, fmtDateTime } from "@/components/app/ui";
import { Icon } from "@/components/Icon";
import { LEAD_STATUSES, LEAD_TYPES } from "@/lib/constants";

export const metadata = { title: "Zapytania" };

export default async function Leads({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  await requireAdmin();
  const sp = await searchParams;
  const status = sp.status && sp.status in LEAD_STATUSES ? sp.status : undefined;
  const [leads, counts] = await Promise.all([
    db.lead.findMany({ where: status ? { status } : {}, orderBy: { createdAt: "desc" }, take: 200 }),
    db.lead.groupBy({ by: ["status"], _count: true }),
  ]);
  const c = Object.fromEntries(counts.map((x) => [x.status, x._count]));
  return (
    <>
      <PageHead title="Zapytania z serwisu" sub="Formularze kontaktowe, prośby o rozmowę i faktury przesłane do analizy." />
      <nav className="tabs">
        <Link href="/admin/zapytania/" aria-current={!status ? "page" : undefined}>
          Wszystkie
        </Link>
        {Object.entries(LEAD_STATUSES).map(([k, v]) => (
          <Link key={k} href={`/admin/zapytania/?status=${k}`} aria-current={status === k ? "page" : undefined}>
            {v} <span className="n">{c[k] ?? 0}</span>
          </Link>
        ))}
      </nav>
      <div className="panel">
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Kto</th>
                <th>Typ / temat</th>
                <th>Kontakt</th>
                <th>Data</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {leads.map((l) => (
                <tr key={l.id}>
                  <td>
                    <Link className="row-link" href={`/admin/zapytania/${l.id}/`}>
                      {l.name}
                    </Link>
                    <div className="muted small">{l.company ?? ""}</div>
                  </td>
                  <td>
                    {LEAD_TYPES[l.type as keyof typeof LEAD_TYPES] ?? l.type}
                    {l.documentId && <Icon name="file" size={14} className="accent" />}
                    <div className="muted small">{l.topic ?? ""}</div>
                  </td>
                  <td className="small">
                    {l.email}
                    <div>{l.phone ?? ""}</div>
                  </td>
                  <td>{fmtDateTime(l.createdAt)}</td>
                  <td>
                    <span className={`badge ${l.status === "NOWE" ? "badge--bad" : l.status === "W_TOKU" ? "badge--info" : "badge--ok"}`}>
                      {LEAD_STATUSES[l.status as keyof typeof LEAD_STATUSES]}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!leads.length && <p className="muted">Brak zapytań.</p>}
      </div>
    </>
  );
}
