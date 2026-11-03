import { requireAdmin } from "@/lib/auth";
import { securityChecks } from "@/lib/security-status";
import { PageHead } from "@/components/app/ui";
import { Icon } from "@/components/Icon";

export const metadata = { title: "Stan bezpieczeństwa" };
export const dynamic = "force-dynamic";

const LABEL = { ok: "OK", warn: "Do sprawdzenia", bad: "Do naprawy" } as const;
const BADGE = { ok: "badge--ok", warn: "badge--warn", bad: "badge--bad" } as const;

export default async function SecurityPage() {
  await requireAdmin();
  const checks = await securityChecks();
  const groups = [...new Set(checks.map((c) => c.group))];
  const bad = checks.filter((c) => c.status === "bad").length;
  const warn = checks.filter((c) => c.status === "warn").length;
  return (
    <>
      <PageHead title="Stan bezpieczeństwa" sub="Automatyczny przegląd konfiguracji serwera, kont, poczty, zadań i kopii zapasowych." />
      <div className={`alert ${bad ? "alert--error" : warn ? "alert--warn" : "alert--ok"}`} style={{ marginBottom: 24 }}>
        <Icon name={bad ? "alert" : "checkCircle"} />
        <p>
          <strong>{bad ? `${bad} do naprawy` : warn ? "Brak krytycznych problemów" : "Wszystko skonfigurowane"}</strong>
          {warn ? `${warn} do sprawdzenia. ` : ""}Rzeczy poza aplikacją (2FA w hostingu, GitHubie, Cloudflare, poczcie) odhacz z listy w BEZPIECZENSTWO.md.
        </p>
      </div>
      <div className="stack">
        {groups.map((g) => (
          <section key={g} className="panel">
            <div className="panel__head">
              <h2>{g}</h2>
            </div>
            <ul className="side-list">
              {checks
                .filter((c) => c.group === g)
                .map((c) => (
                  <li key={c.label} style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) auto", gap: 12, alignItems: "start" }}>
                    <div>
                      <strong>{c.label}</strong>
                      <div className="small muted">{c.detail}</div>
                      {c.status !== "ok" && c.fix && <div className="small" style={{ marginTop: 4 }}>→ {c.fix}</div>}
                    </div>
                    <span className={`badge ${BADGE[c.status]}`}>{LABEL[c.status]}</span>
                  </li>
                ))}
            </ul>
          </section>
        ))}
      </div>
    </>
  );
}
