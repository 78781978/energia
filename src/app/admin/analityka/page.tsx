import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { PageHead } from "@/components/app/ui";

export const metadata = { title: "Analityka" };

const STEP_NAMES = ["Media", "Lata zakupu", "Model ceny", "Taryfa i zużycie", "Faktura", "Firma i PPE", "Podsumowanie"];

export default async function Analytics() {
  await requireAdmin();
  const since = new Date(Date.now() - 90 * 864e5);
  const [steps, appSources, userSources, leadSources, submitted] = await Promise.all([
    db.funnelEvent.groupBy({ by: ["step"], where: { createdAt: { gte: since }, funnel: "wniosek" }, _count: { visitorId: true } }),
    db.application.groupBy({ by: ["source"], where: { createdAt: { gte: since } }, _count: true }),
    db.user.groupBy({ by: ["source"], where: { createdAt: { gte: since }, role: "CLIENT" }, _count: true }),
    db.lead.groupBy({ by: ["source"], where: { createdAt: { gte: since } }, _count: true }),
    db.application.count({ where: { createdAt: { gte: since } } }),
  ]);
  // Unikalni odwiedzający na każdym kroku
  const uniq = await Promise.all(
    STEP_NAMES.map((_, i) =>
      db.funnelEvent.findMany({ where: { createdAt: { gte: since }, funnel: "wniosek", step: i + 1 }, distinct: ["visitorId"], select: { visitorId: true } }).then((r) => r.length),
    ),
  );
  const max = Math.max(1, uniq[0] ?? 0, submitted);
  void steps;

  const sources = new Map<string, { users: number; apps: number; leads: number }>();
  const add = (rows: { source: string | null; _count: number }[], key: "users" | "apps" | "leads") =>
    rows.forEach((r) => {
      const k = r.source ?? "brak zgody / nieznane";
      const e = sources.get(k) ?? { users: 0, apps: 0, leads: 0 };
      e[key] += r._count;
      sources.set(k, e);
    });
  add(userSources, "users");
  add(appSources, "apps");
  add(leadSources, "leads");

  return (
    <>
      <PageHead title="Analityka" sub="Ostatnie 90 dni: lejek wniosku (miejsca porzucenia) i źródła pozyskania klientów." />
      <div className="two-col">
        <section className="panel" aria-labelledby="lejek">
          <div className="panel__head">
            <h2 id="lejek">Lejek formularza wniosku</h2>
            <span className="muted small">unikalni użytkownicy</span>
          </div>
          <div className="stack" style={{ gap: 10 }}>
            {[...STEP_NAMES.map((n, i) => ({ n: `${i + 1}. ${n}`, v: uniq[i] ?? 0 })), { n: "Wysłane wnioski", v: submitted }].map((row, i, arr) => {
              const prev = i > 0 ? arr[i - 1].v : null;
              const drop = prev ? Math.round((1 - row.v / prev) * 100) : null;
              return (
                <div key={row.n}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, marginBottom: 4 }}>
                    <span>{row.n}</span>
                    <span>
                      <strong>{row.v}</strong>
                      {drop != null && drop > 0 && <span className="muted"> · −{drop}%</span>}
                    </span>
                  </div>
                  <div style={{ height: 10, borderRadius: 5, background: "#efece6" }}>
                    <div style={{ width: `${(row.v / max) * 100}%`, height: "100%", borderRadius: 5, background: i === arr.length - 1 ? "var(--graphite)" : "var(--red)" }} />
                  </div>
                </div>
              );
            })}
          </div>
          <p className="muted small" style={{ marginTop: 16, marginBottom: 0 }}>
            Największy spadek między krokami wskazuje miejsce, w którym użytkownicy porzucają formularz.
          </p>
        </section>
        <section className="panel" aria-labelledby="zrodla">
          <div className="panel__head">
            <h2 id="zrodla">Źródła wejścia</h2>
          </div>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Źródło (UTM / odsyłacz)</th>
                  <th>Konta</th>
                  <th>Wnioski</th>
                  <th>Zapytania</th>
                </tr>
              </thead>
              <tbody>
                {[...sources.entries()]
                  .sort((a, b) => b[1].apps + b[1].users - (a[1].apps + a[1].users))
                  .map(([k, v]) => (
                    <tr key={k}>
                      <td>{k}</td>
                      <td>{v.users}</td>
                      <td>{v.apps}</td>
                      <td>{v.leads}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
          {!sources.size && <p className="muted small">Brak danych.</p>}
          <p className="muted small" style={{ marginTop: 16, marginBottom: 0 }}>
            Źródło zapisujemy wyłącznie po zgodzie użytkownika na pliki analityczne. Do mierzenia skuteczności kampanii używaj linków z parametrami UTM.
          </p>
        </section>
      </div>
    </>
  );
}
