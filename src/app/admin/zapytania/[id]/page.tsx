import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { DocList, PageHead, fmtDateTime } from "@/components/app/ui";
import { LEAD_STATUSES, LEAD_TYPES } from "@/lib/constants";
import { setLeadStatus } from "@/app/actions/admin";
import { resendLeadToCrm } from "@/app/actions/crm";
import { livespaceConfigured } from "@/lib/livespace";
import { formatNip } from "@/lib/validators";

export const metadata = { title: "Zapytanie" };

export default async function LeadPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const l = await db.lead.findUnique({ where: { id }, include: { document: true } });
  if (!l) notFound();
  const existing = l.email ? await db.user.findUnique({ where: { email: l.email }, select: { id: true } }) : null;
  const crm = livespaceConfigured();
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
              {l.email ? <a href={`mailto:${l.email}`}>{l.email}</a> : "–"}
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
        <div>
          <div className="panel">
            <div className="panel__head">
              <h2>Livespace (call center)</h2>
            </div>
            {!crm ? (
              <p className="muted small">Integracja nie jest skonfigurowana – zob. Dane firmy → Livespace.</p>
            ) : l.crmId ? (
              <p className="small">
                <span className="badge badge--ok">Wysłano</span> Osoba i zadanie są w Livespace.
              </p>
            ) : (
              <>
                <p className="small">
                  {l.crmError ? (
                    <>
                      <span className="badge badge--bad">Błąd</span> {l.crmError}
                    </>
                  ) : (
                    <span className="badge badge--info">W trakcie wysyłki</span>
                  )}
                </p>
                <form action={resendLeadToCrm}>
                  <input type="hidden" name="leadId" value={l.id} />
                  <button className="btn btn--sm btn--secondary" type="submit">
                    Wyślij ponownie do Livespace
                  </button>
                </form>
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
      </div>
    </>
  );
}
