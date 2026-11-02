import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { DocList, PageHead, StatusBadge, StatusProgress, fmtDate, fmtDateTime, fmtNum } from "@/components/app/ui";
import { AdminUploadForm, AssignOfferForm, MessageForm, NoteForm, ParamsForm, StatusForm } from "@/components/app/AdminForms";
import { CompanyForm } from "@/components/app/CompanyForm";
import { Icon } from "@/components/Icon";
import { MEDIA, OFFER_ASSIGNMENT_STATUS, PRICE_MODELS, STATUS_LABEL, type AppStatus } from "@/lib/constants";
import { companyDraft, pointDrafts } from "@/lib/drafts";
import { linkPointsToApplication, removeOfferAssignment, toggleDocumentVisibility } from "@/app/actions/admin";
import { formatNip } from "@/lib/validators";

export const metadata = { title: "Karta wniosku" };

const ACTION_LABEL: Record<string, string> = {
  create: "Utworzenie wniosku",
  status: "Zmiana statusu",
  update: "Zmiana danych",
  document: "Dodanie dokumentu",
  visibility: "Widoczność dokumentu",
  message: "Komunikat do klienta",
  offer_assigned: "Przypisanie oferty",
  offer_removed: "Usunięcie oferty",
  offer_chosen: "Wybór oferty przez klienta",
  points_linked: "Dołączenie punktów poboru",
};

export default async function AdminApplication({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const app = await db.application.findUnique({
    where: { id },
    include: {
      user: true,
      company: { include: { points: { orderBy: { createdAt: "asc" } } } },
      points: { include: { point: true } },
      documents: { orderBy: { createdAt: "desc" }, include: { uploadedBy: { select: { role: true } } } },
      statusChanges: { orderBy: { createdAt: "desc" }, include: { changedBy: { select: { email: true, name: true, role: true } } } },
      notes: { orderBy: { createdAt: "desc" }, include: { author: { select: { email: true, name: true } } } },
      messages: { orderBy: { createdAt: "desc" } },
      offers: { include: { offer: true }, orderBy: { createdAt: "asc" } },
    },
  });
  if (!app) notFound();
  const [logs, offers, otherApps] = await Promise.all([
    db.auditLog.findMany({
      where: { OR: [{ entityType: "Application", entityId: app.id }, { entityType: "Company", entityId: app.companyId }] },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: { actor: { select: { email: true, name: true, role: true } } },
    }),
    db.offer.findMany({ where: { isActive: true }, orderBy: { createdAt: "desc" } }),
    db.application.findMany({ where: { companyId: app.companyId, id: { not: app.id } }, select: { id: true, number: true, status: true } }),
  ]);
  const unlinked = app.company.points.length - app.points.length;
  const who = (u: { email: string; name: string | null; role?: string } | null) => (u ? `${u.name || u.email}${u.role === "CLIENT" ? " (klient)" : ""}` : "system");

  return (
    <>
      <p className="small" style={{ marginBottom: 8 }}>
        <Link href="/admin/">← Wszystkie wnioski</Link>
      </p>
      <PageHead
        title={`${app.company.name}`}
        sub={
          <>
            Wniosek {app.number} · NIP {formatNip(app.company.nip)} · złożony {fmtDateTime(app.createdAt)}
            {app.source && ` · źródło: ${app.source}`}
          </>
        }
        actions={<StatusBadge status={app.status} />}
      />
      {app.wantsCall && (
        <div className="alert alert--warn" style={{ marginBottom: 16 }}>
          <Icon name="phone" />
          <p>
            <strong>Klient prosi o telefon</strong>
            {app.company.contactName ?? ""} · {app.company.contactPhone ?? app.user.phone ?? "brak numeru"}
          </p>
        </div>
      )}
      <div className="panel" style={{ marginBottom: 24 }}>
        <StatusProgress status={app.status} />
      </div>

      <div className="two-col">
        <div className="stack">
          <section className="panel">
            <div className="panel__head">
              <h2>Parametry wniosku</h2>
            </div>
            <dl className="dl" style={{ marginBottom: 16 }}>
              <dt>Media / model</dt>
              <dd>
                {MEDIA[app.media as keyof typeof MEDIA]} · {PRICE_MODELS[app.priceModel as keyof typeof PRICE_MODELS]?.label}
              </dd>
              <dt>Lata</dt>
              <dd>{app.years.replace(/,/g, ", ")}</dd>
              <dt>Taryfa / zużycie</dt>
              <dd>
                {app.tariff ?? "–"} / {app.annualUsageMWh != null ? `${fmtNum(app.annualUsageMWh)} MWh` : "–"}
              </dd>
              <dt>Konto klienta</dt>
              <dd>
                <Link href={`/admin/klienci/${app.userId}/`}>{app.user.email}</Link>
                {app.user.phone && ` · ${app.user.phone}`}
              </dd>
              {app.clientComment && (
                <>
                  <dt>Uwagi klienta</dt>
                  <dd style={{ fontWeight: 400 }}>{app.clientComment}</dd>
                </>
              )}
            </dl>
            <details>
              <summary className="btn btn--ghost btn--sm" style={{ listStyle: "none" }}>
                Edytuj parametry
              </summary>
              <div style={{ marginTop: 16 }}>
                <ParamsForm app={app} />
              </div>
            </details>
          </section>

          <section className="panel">
            <div className="panel__head">
              <h2>Punkty poboru we wniosku ({app.points.length})</h2>
              {unlinked > 0 && (
                <form action={linkPointsToApplication}>
                  <input type="hidden" name="applicationId" value={app.id} />
                  <button className="btn btn--ghost btn--sm" type="submit">
                    Dołącz pozostałe punkty firmy ({unlinked})
                  </button>
                </form>
              )}
            </div>
            {app.points.length ? (
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>PPE</th>
                      <th>Adres</th>
                      <th>Sprzedawca / OSD</th>
                      <th>Taryfa</th>
                      <th>Zużycie</th>
                      <th>Moc</th>
                      <th>Koniec umowy</th>
                    </tr>
                  </thead>
                  <tbody>
                    {app.points.map(({ point: p }) => (
                      <tr key={p.id}>
                        <td>
                          <strong>{p.ppeNumber ?? "–"}</strong>
                          <div className="muted small">{p.medium === "GAZ" ? "Gaz" : "Prąd"}</div>
                        </td>
                        <td>{[p.street, p.postalCode, p.city].filter(Boolean).join(", ") || "–"}</td>
                        <td>
                          {p.currentSeller ?? "–"}
                          <div className="muted small">{p.operator ?? ""}</div>
                        </td>
                        <td>{p.tariff ?? "–"}</td>
                        <td>{p.annualUsageMWh != null ? `${fmtNum(p.annualUsageMWh)} MWh` : "–"}</td>
                        <td>{p.contractedPowerKw != null ? `${fmtNum(p.contractedPowerKw)} kW` : "–"}</td>
                        <td>{fmtDate(p.contractEndDate)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="muted small">Brak punktów – uzupełnij je na podstawie faktury w danych firmy poniżej.</p>
            )}
          </section>

          <section className="panel">
            <div className="panel__head">
              <h2>Oferty</h2>
            </div>
            {app.offers.length > 0 && (
              <ul className="doc-list" style={{ marginBottom: 16 }}>
                {app.offers.map((o) => (
                  <li key={o.id} className="doc-item">
                    <Icon name="tag" className="doc-item__icon" />
                    <div className="doc-item__meta">
                      <strong>
                        {o.offer.supplier} – {o.offer.name}
                      </strong>
                      <span>
                        {fmtNum(o.customPriceNetMWh ?? o.offer.priceNetMWh)} zł/MWh · {OFFER_ASSIGNMENT_STATUS[o.status as keyof typeof OFFER_ASSIGNMENT_STATUS]}
                      </span>
                    </div>
                    {o.status === "WYBRANA" ? (
                      <span className="badge badge--ok">wybrana</span>
                    ) : (
                      <form action={removeOfferAssignment}>
                        <input type="hidden" name="assignmentId" value={o.id} />
                        <button className="btn btn--ghost btn--sm" type="submit" aria-label="Usuń ofertę z wniosku">
                          <Icon name="trash" size={16} />
                        </button>
                      </form>
                    )}
                  </li>
                ))}
              </ul>
            )}
            <AssignOfferForm
              applicationId={app.id}
              offers={offers
                .filter((o) => !app.offers.some((a) => a.offerId === o.id))
                .map((o) => ({ id: o.id, label: `${o.supplier} – ${o.name} (${fmtNum(o.priceNetMWh)} zł/MWh, ${o.years})` }))}
            />
          </section>

          <section className="panel">
            <div className="panel__head">
              <h2>Dokumenty ({app.documents.length})</h2>
            </div>
            {app.documents.length ? (
              <ul className="doc-list">
                {app.documents.map((d) => (
                  <li key={d.id} className="doc-item">
                    <Icon name="file" className="doc-item__icon" />
                    <div className="doc-item__meta">
                      <strong title={d.fileName}>{d.fileName}</strong>
                      <span>
                        {d.kind} · {fmtDateTime(d.createdAt)} · {d.uploadedBy?.role === "ADMIN" ? "doradca" : "klient"}
                        {!d.visibleToClient && " · ukryty przed klientem"}
                      </span>
                    </div>
                    <form action={toggleDocumentVisibility}>
                      <input type="hidden" name="documentId" value={d.id} />
                      <button className="btn btn--ghost btn--sm" type="submit" title={d.visibleToClient ? "Ukryj przed klientem" : "Pokaż klientowi"}>
                        <Icon name={d.visibleToClient ? "eye" : "lock"} size={16} />
                        <span className="sr-only">{d.visibleToClient ? "Ukryj przed klientem" : "Pokaż klientowi"}</span>
                      </button>
                    </form>
                    <a className="btn btn--ghost btn--sm" href={`/api/pliki/${d.id}?podglad=1`} target="_blank" rel="noreferrer" aria-label={`Otwórz ${d.fileName}`}>
                      <Icon name="download" size={16} />
                    </a>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="muted small">Brak dokumentów.</p>
            )}
            <h3 style={{ fontSize: 16, marginTop: 24 }}>Dodaj dokument</h3>
            <AdminUploadForm applicationId={app.id} />
          </section>

          <details className="panel">
            <summary style={{ cursor: "pointer", fontWeight: 700, fontSize: 19 }}>Dane firmy i punktów poboru (edycja)</summary>
            <div style={{ marginTop: 16 }}>
              <CompanyForm company={companyDraft(app.company, app.user)} points={pointDrafts(app.company.points)} mode="admin" />
            </div>
          </details>
        </div>

        <div className="stack">
          <section className="panel">
            <div className="panel__head">
              <h2>Status</h2>
            </div>
            <StatusForm applicationId={app.id} current={app.status} />
          </section>

          <section className="panel">
            <div className="panel__head">
              <h2>Kontakt</h2>
            </div>
            <dl className="dl">
              <dt>Osoba</dt>
              <dd>{app.company.contactName ?? "–"}</dd>
              <dt>Telefon</dt>
              <dd>{app.company.contactPhone ? <a href={`tel:${app.company.contactPhone}`}>{app.company.contactPhone}</a> : "–"}</dd>
              <dt>E-mail</dt>
              <dd>
                <a href={`mailto:${app.company.contactEmail ?? app.user.email}`}>{app.company.contactEmail ?? app.user.email}</a>
              </dd>
              <dt>Siedziba</dt>
              <dd>{[app.company.hqStreet, app.company.hqPostalCode, app.company.hqCity].filter(Boolean).join(", ") || "–"}</dd>
              {!app.company.corrSameAsHq && (
                <>
                  <dt>Korespondencja</dt>
                  <dd>{[app.company.corrStreet, app.company.corrPostalCode, app.company.corrCity].filter(Boolean).join(", ")}</dd>
                </>
              )}
              <dt>Forma</dt>
              <dd>{app.company.legalForm ?? "–"}</dd>
              {app.company.regon && (
                <>
                  <dt>REGON</dt>
                  <dd>{app.company.regon}</dd>
                </>
              )}
            </dl>
            {otherApps.length > 0 && (
              <p className="small" style={{ marginTop: 16, marginBottom: 0 }}>
                Inne wnioski firmy:{" "}
                {otherApps.map((o, i) => (
                  <span key={o.id}>
                    {i > 0 && ", "}
                    <Link href={`/admin/wnioski/${o.id}/`}>{o.number}</Link>
                  </span>
                ))}
              </p>
            )}
          </section>

          <section className="panel">
            <div className="panel__head">
              <h2>Komunikat do klienta</h2>
            </div>
            <MessageForm applicationId={app.id} />
            {app.messages.length > 0 && (
              <div className="stack" style={{ gap: 8, marginTop: 16 }}>
                {app.messages.map((m) => (
                  <div key={m.id} className="message">
                    <div className="message__meta">
                      {fmtDateTime(m.createdAt)} · {m.readAt ? "przeczytany" : "nieprzeczytany"}
                    </div>
                    {m.body}
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="panel">
            <div className="panel__head">
              <h2>Notatki wewnętrzne</h2>
            </div>
            <NoteForm applicationId={app.id} />
            <div className="stack" style={{ gap: 8, marginTop: 16 }}>
              {app.notes.map((n) => (
                <div key={n.id} className="message" style={{ background: "#fff8e6" }}>
                  <div className="message__meta">
                    {fmtDateTime(n.createdAt)} · {who(n.author)}
                  </div>
                  {n.body}
                </div>
              ))}
            </div>
          </section>

          <section className="panel">
            <div className="panel__head">
              <h2>Historia statusów</h2>
            </div>
            <ol className="timeline">
              {app.statusChanges.map((s) => (
                <li key={s.id}>
                  <strong>{STATUS_LABEL[s.toStatus as AppStatus] ?? s.toStatus}</strong>
                  <div className="muted">
                    {fmtDateTime(s.createdAt)} · {who(s.changedBy)}
                  </div>
                  {s.comment && <div>{s.comment}</div>}
                </li>
              ))}
            </ol>
          </section>

          <section className="panel">
            <div className="panel__head">
              <h2>Log zmian</h2>
            </div>
            <ol className="timeline">
              {logs.map((l) => {
                const changes = l.changes ? (JSON.parse(l.changes) as Record<string, [unknown, unknown]>) : null;
                return (
                  <li key={l.id}>
                    <strong>{ACTION_LABEL[l.action] ?? l.action}</strong>
                    <div className="muted">
                      {fmtDateTime(l.createdAt)} · {who(l.actor)}
                    </div>
                    {changes && (
                      <ul style={{ margin: "4px 0 0", paddingLeft: 16 }}>
                        {Object.entries(changes).map(([k, [a, b]]) => (
                          <li key={k} style={{ padding: 0 }}>
                            {k}: <s className="muted">{String(a ?? "–")}</s> → {String(b ?? "–")}
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                );
              })}
            </ol>
          </section>
        </div>
      </div>
    </>
  );
}
