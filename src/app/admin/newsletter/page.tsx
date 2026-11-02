import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { PageHead, fmtDate } from "@/components/app/ui";
import { Icon } from "@/components/Icon";

export const metadata = { title: "Newsletter" };

export default async function Newsletter() {
  await requireAdmin();
  const [subs, marketingUsers] = await Promise.all([
    db.newsletterSubscriber.findMany({ orderBy: { createdAt: "desc" }, take: 500 }),
    db.user.count({ where: { role: "CLIENT", marketingConsent: true } }),
  ]);
  const active = subs.filter((s) => !s.unsubscribedAt);
  return (
    <>
      <PageHead
        title="Newsletter"
        sub={`${active.length} aktywnych subskrypcji · ${marketingUsers} klientów portalu ze zgodą marketingową`}
        actions={
          <a className="btn btn--ghost" href="/admin/newsletter/eksport/">
            <Icon name="download" size={18} /> Eksport CSV
          </a>
        }
      />
      <div className="alert" style={{ marginBottom: 16 }}>
        <Icon name="info" />
        <p>Eksport CSV możesz zaimportować do systemu wysyłkowego (np. Klaviyo, Mailchimp, HubSpot). Integrację automatyczną można dodać w kolejnym etapie.</p>
      </div>
      <div className="panel">
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>E-mail</th>
                <th>Źródło zapisu</th>
                <th>Data</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {subs.map((s) => (
                <tr key={s.id}>
                  <td>{s.email}</td>
                  <td>{s.source ?? "–"}</td>
                  <td>{fmtDate(s.createdAt)}</td>
                  <td>{s.unsubscribedAt ? <span className="badge">wypisany</span> : <span className="badge badge--ok">aktywny</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!subs.length && <p className="muted">Brak zapisów.</p>}
      </div>
    </>
  );
}
