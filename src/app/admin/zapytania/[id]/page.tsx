import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { DocList, PageHead, fmtDateTime } from "@/components/app/ui";
import { LEAD_STATUSES, LEAD_TYPES } from "@/lib/constants";
import { setLeadStatus } from "@/app/actions/admin";
import { formatNip } from "@/lib/validators";

export const metadata = { title: "Zapytanie" };

export default async function LeadPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const l = await db.lead.findUnique({ where: { id }, include: { document: true } });
  if (!l) notFound();
  const existing = await db.user.findUnique({ where: { email: l.email }, select: { id: true } });
  return (
    <>
      <p className="small" style={{ marginBottom: 8 }}>
        <Link href="/admin/zapytania/">← Zapytania</Link>
      </p>
      <PageHead title={l.name} sub={`${LEAD_TYPES[l.type as keyof typeof LEAD_TYPES] ?? l.type} · ${fmtDateTime(l.createdAt)}`} />
      <div className="two-col">
        <div className="panel">
          <dl className="dl">
            <dt>Temat</dt>
            <dd>{l.topic ?? "–"}</dd>
            <dt>Firma</dt>
            <dd>{l.company ?? "–"}</dd>
            <dt>NIP</dt>
            <dd>{l.nip ? formatNip(l.nip) : "–"}</dd>
            <dt>E-mail</dt>
            <dd>
              <a href={`mailto:${l.email}`}>{l.email}</a>
              {existing && (
                <>
                  {" "}
                  · <Link href={`/admin/klienci/${existing.id}/`}>ma konto w portalu</Link>
                </>
              )}
            </dd>
            <dt>Telefon</dt>
            <dd>{l.phone ? <a href={`tel:${l.phone}`}>{l.phone}</a> : "–"}</dd>
            <dt>Strona</dt>
            <dd>{l.pagePath ?? "–"}</dd>
            <dt>Źródło</dt>
            <dd>{l.source ?? "–"}</dd>
            <dt>Zgoda marketingowa</dt>
            <dd>{l.marketingConsent ? "tak" : "nie"}</dd>
          </dl>
          {l.message && (
            <>
              <h3 style={{ fontSize: 16, marginTop: 24 }}>Wiadomość</h3>
              <p style={{ whiteSpace: "pre-wrap" }}>{l.message}</p>
            </>
          )}
          {l.document && (
            <>
              <h3 style={{ fontSize: 16, marginTop: 24 }}>Załącznik</h3>
              <DocList docs={[l.document]} />
            </>
          )}
        </div>
        <div className="panel">
          <div className="panel__head">
            <h2>Status</h2>
          </div>
          <div className="btn-row">
            {Object.entries(LEAD_STATUSES).map(([k, v]) => (
              <form key={k} action={setLeadStatus}>
                <input type="hidden" name="leadId" value={l.id} />
                <input type="hidden" name="status" value={k} />
                <button className={`btn btn--sm ${l.status === k ? "btn--dark" : "btn--ghost"}`} type="submit" aria-pressed={l.status === k}>
                  {v}
                </button>
              </form>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
