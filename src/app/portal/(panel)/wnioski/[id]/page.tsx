import Link from "next/link";
import { notFound } from "next/navigation";
import { requireClient } from "@/lib/auth";
import { db } from "@/lib/db";
import { DocList, PageHead, StatusBadge, StatusProgress, fmtDate, fmtDateTime, fmtNum } from "@/components/app/ui";
import { ClientUpload } from "@/components/app/ClientUpload";
import { Icon } from "@/components/Icon";
import { MEDIA, PRICE_MODELS, STATUS_HELP, STATUS_LABEL, type AppStatus } from "@/lib/constants";
import { chooseOffer, requestCall } from "@/app/actions/portal";
import { SubmitButton } from "@/components/forms";
import { GeneratorReveal } from "@/components/app/GeneratorReveal";
import { OFFER_CLAUSE } from "@/lib/wizard";

export const metadata = { title: "Szczegóły wniosku" };

export default async function ApplicationDetail({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ nowy?: string; generuj?: string; nowe?: string }> }) {
  const user = await requireClient();
  const { id } = await params;
  const sp = await searchParams;
  const app = await db.application.findFirst({
    where: { id, userId: user.id },
    include: {
      company: true,
      points: { include: { point: true } },
      documents: { where: { visibleToClient: true }, orderBy: { createdAt: "desc" }, include: { uploadedBy: { select: { role: true } } } },
      statusChanges: { orderBy: { createdAt: "desc" } },
      messages: { orderBy: { createdAt: "desc" } },
      offers: { include: { offer: { include: { document: true } } }, orderBy: { createdAt: "asc" } },
    },
  });
  if (!app) notFound();
  const status = app.status as AppStatus;
  const contracts = app.documents.filter((d) => d.kind === "UMOWA");
  const chosen = app.offers.find((o) => o.status === "WYBRANA");
  const verified = Boolean(user.emailVerifiedAt);
  const fresh = sp.nowy === "1" || sp.generuj === "1";
  const models = (app.priceModels ?? app.priceModel).split(",").filter(Boolean);

  return (
    <>
      <p className="small" style={{ marginBottom: 8 }}>
        <Link href="/portal/wnioski/">← Moje wnioski</Link>
      </p>
      <PageHead title={`Wniosek ${app.number}`} sub={`${app.company.name} · złożony ${fmtDate(app.createdAt)}`} actions={<StatusBadge status={app.status} />} />

      {sp.generuj === "1" && <GeneratorReveal found={app.offers.length} />}
      {fresh && (
        <div className="panel" style={{ display: "flex", gap: 24, alignItems: "center", marginBottom: 24, flexWrap: "wrap" }}>
          <img src="/img/3d/potwierdzenie.png" alt="" width={160} height={121} style={{ width: 160 }} />
          <div style={{ flex: "1 1 320px" }}>
            <h2 style={{ fontSize: 22, marginBottom: 6 }}>{sp.nowe === "1" ? "Profil zarejestrowany, zamówienie przyjęte" : "Zamówienie przyjęte"}</h2>
            <p className="muted" style={{ margin: 0 }}>
              {app.offers.length
                ? "Poniżej znajdziesz wstępne propozycje dobrane przez generator. Doradca sprawdzi je i w razie potrzeby zaktualizuje w ciągu 24 godzin."
                : "Doradca zweryfikuje dane i przygotuje oferty – o zmianach statusu poinformujemy Cię e-mailem."}
            </p>
          </div>
        </div>
      )}

      <div className="panel" style={{ marginBottom: 24 }}>
        <StatusProgress status={app.status} />
        <div className={`alert ${status === "OCZEKUJE_NA_PODPIS" ? "alert--warn" : status === "ODRZUCONA" ? "alert--error" : status === "AKTYWOWANA" ? "alert--ok" : ""}`}>
          <Icon name={status === "AKTYWOWANA" ? "checkCircle" : "info"} />
          <p>
            <strong>{STATUS_LABEL[status]}</strong>
            {STATUS_HELP[status]}
          </p>
        </div>
      </div>

      <div className="two-col">
        <div className="stack">
          {status === "OCZEKUJE_NA_PODPIS" && (
            <section className="panel" aria-labelledby="podpis" style={{ borderColor: "var(--red-btn)" }}>
              <div className="panel__head">
                <h2 id="podpis">Podpisz umowę</h2>
              </div>
              <ol style={{ paddingLeft: 20, marginTop: 0 }}>
                <li>Pobierz umowę i zapoznaj się z warunkami.</li>
                <li>Podpisz ją podpisem kwalifikowanym lub zaufanym (albo wydrukuj, podpisz i zeskanuj).</li>
                <li>Prześlij podpisany dokument w formacie PDF.</li>
              </ol>
              <DocList docs={contracts} empty="Umowa zostanie udostępniona przez doradcę." />
              <div style={{ marginTop: 16 }}>
                {verified ? <ClientUpload applicationId={app.id} signed /> : <p className="small muted">Potwierdź adres e-mail, aby przesłać podpisaną umowę.</p>}
              </div>
            </section>
          )}

          {app.offers.length > 0 && (
            <section className="panel" aria-labelledby="oferty">
              <div className="panel__head">
                <h2 id="oferty">Oferty dla Twojej firmy</h2>
                <span className="muted small">Pełne warunki znajdziesz w cenniku PDF</span>
              </div>
              <div className="grid grid-2" style={{ gap: 12 }}>
                {app.offers.map((o) => (
                  <div key={o.id} className="offer-card" data-selected={o.status === "WYBRANA"}>
                    <div className="muted small">{o.offer.supplier}</div>
                    <strong style={{ fontSize: 17 }}>{o.offer.name}</strong>
                    <div className="offer-card__price">
                      {fmtNum(o.customPriceNetMWh ?? o.offer.priceNetMWh)} <span className="small muted">zł netto / MWh</span>
                    </div>
                    <div className="small muted">
                      {PRICE_MODELS[o.offer.priceModel as keyof typeof PRICE_MODELS]?.label ?? o.offer.priceModel} · lata {o.offer.years.replace(/,/g, ", ")}
                      {o.offer.tradeFeeMonthly != null && ` · opłata handlowa ${fmtNum(o.offer.tradeFeeMonthly)} zł/mies.`}
                      {o.offer.validUntil && ` · ważna do ${fmtDate(o.offer.validUntil)}`}
                    </div>
                    {o.note && <div className="small">{o.note}</div>}
                    {o.offer.document?.visibleToClient && (
                      <a className="link-arrow small" href={`/api/pliki/${o.offer.document.id}?podglad=1`} target="_blank" rel="noreferrer">
                        <Icon name="file" size={16} /> Cennik / warunki (PDF)
                      </a>
                    )}
                    {o.auto && o.editableUntil && o.editableUntil > new Date() && <span className="badge badge--plain" style={{ whiteSpace: "normal", alignSelf: "flex-start" }}>Propozycja wstępna – weryfikacja doradcy</span>}
                    {o.status === "WYBRANA" ? (
                      <span className="badge badge--ok">Wybrana oferta</span>
                    ) : o.status === "ODRZUCONA" ? (
                      <span className="badge">Niewybrana</span>
                    ) : !chosen && !verified ? (
                      <span className="small muted">Potwierdź adres e-mail, aby wybrać ofertę.</span>
                    ) : !chosen ? (
                      <form action={chooseOffer}>
                        <input type="hidden" name="assignmentId" value={o.id} />
                        <SubmitButton className="btn btn--sm" pending="Zapisuję…">
                          Wybieram tę ofertę
                        </SubmitButton>
                      </form>
                    ) : null}
                  </div>
                ))}
              </div>
              <p className="small muted" style={{ marginTop: 12, marginBottom: 0 }}>
                Cena za MWh nie obejmuje opłat dystrybucyjnych, podatków i innych składników faktury.
              </p>
              <p className="offer-clause">{OFFER_CLAUSE}</p>
            </section>
          )}

          <section className="panel" aria-labelledby="dokumenty">
            <div className="panel__head">
              <h2 id="dokumenty">Dokumenty</h2>
            </div>
            <DocList docs={app.documents} />
            <details style={{ marginTop: 16 }}>
              <summary className="btn btn--secondary btn--sm" style={{ listStyle: "none" }}>
                <Icon name="plus" size={16} /> Dodaj dokument
              </summary>
              <div style={{ marginTop: 16 }}>
                <ClientUpload applicationId={app.id} />
              </div>
            </details>
          </section>

          <section className="panel" aria-labelledby="ppe">
            <div className="panel__head">
              <h2 id="ppe">Liczniki ({app.points.length})</h2>
              <Link href="/portal/liczniki/" className="small">
                Edytuj dane
              </Link>
            </div>
            {app.points.length ? (
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Licznik / PPE / PPG</th>
                      <th>Adres</th>
                      <th>Taryfa</th>
                      <th>Zużycie</th>
                      <th>Sprzedawca</th>
                    </tr>
                  </thead>
                  <tbody>
                    {app.points.map(({ point: p }) => (
                      <tr key={p.id}>
                        <td>
                          <strong>{p.ppeNumber ?? "–"}</strong>
                          <div className="muted small">
                            {p.medium === "GAZ" ? "Gaz" : "Prąd"}
                            {p.name && ` · ${p.name}`}
                            {p.meterNumber && ` · licznik ${p.meterNumber}`}
                          </div>
                        </td>
                        <td>{[p.street, p.postalCode, p.city].filter(Boolean).join(", ") || "–"}</td>
                        <td>{p.tariff ?? "–"}</td>
                        <td>{p.annualUsageMWh != null ? `${fmtNum(p.annualUsageMWh)} MWh` : "–"}</td>
                        <td>{p.currentSeller ?? "–"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="muted small">Dane punktów poboru uzupełni doradca na podstawie faktury.</p>
            )}
          </section>
        </div>

        <div className="stack">
          <section className="panel">
            <div className="panel__head">
              <h2>Parametry wniosku</h2>
            </div>
            <dl className="dl">
              <dt>Media</dt>
              <dd>{MEDIA[app.media as keyof typeof MEDIA]}</dd>
              <dt>Lata</dt>
              <dd>{app.years.replace(/,/g, ", ")}</dd>
              <dt>Warianty</dt>
              <dd>{models.map((m) => PRICE_MODELS[m as keyof typeof PRICE_MODELS]?.label ?? m).join(" · ")}</dd>
              {app.media !== "GAZ" && (
                <>
                  <dt>Prąd: taryfa / zużycie</dt>
                  <dd>
                    {app.tariff ?? "–"} / {app.annualUsageMWh != null ? `${fmtNum(app.annualUsageMWh)} MWh` : "–"}
                  </dd>
                </>
              )}
              {app.media !== "PRAD" && (
                <>
                  <dt>Gaz: taryfa / zużycie</dt>
                  <dd>
                    {app.tariffGas ?? "–"} / {app.annualUsageGasMWh != null ? `${fmtNum(app.annualUsageGasMWh)} MWh` : "–"}
                  </dd>
                </>
              )}
            </dl>
            {!app.wantsCall ? (
              <form action={requestCall} style={{ marginTop: 16 }}>
                <input type="hidden" name="applicationId" value={app.id} />
                <SubmitButton className="btn btn--secondary btn--block" arrow={false} pending="Wysyłanie…">
                  <Icon name="phone" size={18} /> Zamów rozmowę z doradcą
                </SubmitButton>
              </form>
            ) : (
              <div className="alert alert--ok" style={{ marginTop: 16 }}>
                <Icon name="phone" />
                <p>Doradca zadzwoni do Ciebie w sprawie tego wniosku.</p>
              </div>
            )}
          </section>

          {app.messages.length > 0 && (
            <section className="panel">
              <div className="panel__head">
                <h2>Komunikaty</h2>
              </div>
              <div className="stack" style={{ gap: 10 }}>
                {app.messages.map((m) => (
                  <div key={m.id} className="message">
                    <div className="message__meta">{fmtDateTime(m.createdAt)}</div>
                    {m.body}
                  </div>
                ))}
              </div>
            </section>
          )}

          <section className="panel">
            <div className="panel__head">
              <h2>Historia</h2>
            </div>
            <ol className="timeline">
              {app.statusChanges.map((s) => (
                <li key={s.id}>
                  <strong>{STATUS_LABEL[s.toStatus as AppStatus] ?? s.toStatus}</strong>
                  <div className="muted">{fmtDateTime(s.createdAt)}</div>
                  {s.comment && <div>{s.comment}</div>}
                </li>
              ))}
            </ol>
          </section>
        </div>
      </div>
    </>
  );
}
