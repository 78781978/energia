import Link from "next/link";
import { requireClient } from "@/lib/auth";
import { db } from "@/lib/db";
import { DocList, PageHead, StatusBadge, StatusProgress, fmtDate, fmtDateTime } from "@/components/app/ui";
import { Icon } from "@/components/Icon";
import { MEDIA, STATUS_HELP, type AppStatus } from "@/lib/constants";
import { markMessagesRead } from "@/app/actions/portal";

export const metadata = { title: "Pulpit" };

export default async function Dashboard() {
  const user = await requireClient();
  const [apps, docs, messages] = await Promise.all([
    db.application.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, include: { company: true } }),
    db.document.findMany({
      where: { visibleToClient: true, OR: [{ application: { userId: user.id } }, { company: { ownerId: user.id } }] },
      orderBy: { createdAt: "desc" },
      take: 5,
      include: { uploadedBy: { select: { role: true } } },
    }),
    db.message.findMany({ where: { recipientId: user.id }, orderBy: { createdAt: "desc" }, take: 5, include: { application: { select: { number: true } } } }),
  ]);
  const current = apps.find((a) => !["AKTYWOWANA", "ODRZUCONA"].includes(a.status)) ?? apps[0];
  const unread = messages.some((m) => !m.readAt);
  const greeting = user.name ? `Dzień dobry, ${user.name.split(" ")[0]}` : "Dzień dobry";

  return (
    <>
      <PageHead
        title={greeting}
        sub="Tu sprawdzisz status wniosku, dokumenty i wiadomości od doradcy."
        actions={
          <Link className="btn" href="/portal/wniosek/">
            <Icon name="plus" size={18} /> Nowy wniosek
          </Link>
        }
      />

      {!current ? (
        <div className="panel empty">
          <img src="/img/3d/porownanie.png" alt="" width={200} height={123} />
          <h3>Nie masz jeszcze żadnego wniosku</h3>
          <p>Wypełnij wniosek o ofertę na prąd lub gaz – zajmie to kilka minut. Wystarczy faktura.</p>
          <Link className="btn btn--lg" href="/portal/wniosek/">
            Wypełnij wniosek <Icon name="arrowRight" size={18} className="arrow" />
          </Link>
        </div>
      ) : (
        <div className="two-col">
          <div className="stack">
            <section className="panel" aria-labelledby="biezacy">
              <div className="panel__head">
                <h2 id="biezacy">
                  Wniosek {current.number}{" "}
                  <span className="muted small" style={{ fontWeight: 400 }}>
                    · {current.company.name} · {MEDIA[current.media as keyof typeof MEDIA]}
                  </span>
                </h2>
                <StatusBadge status={current.status} />
              </div>
              <StatusProgress status={current.status} />
              <div className={`alert ${current.status === "OCZEKUJE_NA_PODPIS" ? "alert--warn" : ""}`}>
                <Icon name={current.status === "OCZEKUJE_NA_PODPIS" ? "alert" : "info"} />
                <p>{STATUS_HELP[current.status as AppStatus]}</p>
              </div>
              <div className="btn-row" style={{ marginTop: 16 }}>
                <Link className="btn" href={`/portal/wnioski/${current.id}/`}>
                  {current.status === "OCZEKUJE_NA_PODPIS" ? "Podpisz umowę" : "Szczegóły wniosku"} <Icon name="arrowRight" size={18} className="arrow" />
                </Link>
              </div>
            </section>

            <section className="panel" aria-labelledby="ostatnie-dok">
              <div className="panel__head">
                <h2 id="ostatnie-dok">Ostatnie dokumenty</h2>
                <Link href="/portal/dokumenty/" className="small">
                  Wszystkie dokumenty
                </Link>
              </div>
              <DocList docs={docs} />
            </section>
          </div>

          <div className="stack">
            <section className="panel" aria-labelledby="komunikaty">
              <div className="panel__head">
                <h2 id="komunikaty">Komunikaty od doradcy</h2>
                {unread && (
                  <form action={markMessagesRead}>
                    <button className="btn btn--ghost btn--sm" type="submit">
                      Oznacz jako przeczytane
                    </button>
                  </form>
                )}
              </div>
              {messages.length ? (
                <div className="stack" style={{ gap: 10 }}>
                  {messages.map((m) => (
                    <div key={m.id} className={`message ${m.readAt ? "" : "message--unread"}`}>
                      <div className="message__meta">
                        {fmtDateTime(m.createdAt)}
                        {m.application && ` · wniosek ${m.application.number}`}
                      </div>
                      {m.body}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="muted small">Brak komunikatów. O ważnych zmianach poinformujemy Cię tutaj i e-mailem.</p>
              )}
            </section>
            {apps.length > 1 && (
              <section className="panel">
                <div className="panel__head">
                  <h2>Pozostałe wnioski</h2>
                </div>
                <ul className="side-list">
                  {apps
                    .filter((a) => a.id !== current.id)
                    .slice(0, 5)
                    .map((a) => (
                      <li key={a.id}>
                        <Link href={`/portal/wnioski/${a.id}/`} style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                          <span>
                            {a.number} <span className="muted small">· {fmtDate(a.createdAt)}</span>
                          </span>
                          <StatusBadge status={a.status} />
                        </Link>
                      </li>
                    ))}
                </ul>
              </section>
            )}
          </div>
        </div>
      )}
    </>
  );
}
