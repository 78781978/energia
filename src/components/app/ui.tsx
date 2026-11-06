import { Icon } from "@/components/Icon";
import { APP_STATUSES, DOC_KINDS, STATUS_LABEL, STATUS_TONE, type AppStatus } from "@/lib/constants";

export const fmtDate = (d: Date | string | null | undefined) =>
  d ? new Intl.DateTimeFormat("pl-PL", { day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(d)) : "–";
export const fmtDateTime = (d: Date | string | null | undefined) =>
  d
    ? new Intl.DateTimeFormat("pl-PL", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(d))
    : "–";
/** Cena zawsze z dwoma miejscami po przecinku: 423,20. */
export const fmtPrice = (n: number | null | undefined) =>
  n == null ? "–" : new Intl.NumberFormat("pl-PL", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
export const fmtNum = (n: number | null | undefined, digits = 2) =>
  n == null ? "–" : new Intl.NumberFormat("pl-PL", { maximumFractionDigits: digits }).format(n);
export const fmtSize = (b: number) => (b > 1024 * 1024 ? `${(b / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} kB`);

export function StatusBadge({ status }: { status: string }) {
  const s = (APP_STATUSES as readonly string[]).includes(status) ? (status as AppStatus) : null;
  if (!s) return <span className="badge">{status}</span>;
  const tone = STATUS_TONE[s];
  return <span className={`badge ${tone === "neutral" ? "" : `badge--${tone}`}`}>{STATUS_LABEL[s]}</span>;
}

/** Pasek postępu wniosku (bez statusu „Odrzucona”). */
export function StatusProgress({ status }: { status: string }) {
  const flow = APP_STATUSES.filter((s) => s !== "ODRZUCONA");
  const idx = flow.indexOf(status as (typeof flow)[number]);
  return (
    <ol className="progress-steps" aria-label="Etapy wniosku">
      {flow.map((s, i) => (
        <li key={s} data-state={idx === -1 ? "todo" : i < idx ? "done" : i === idx ? "current" : "todo"} aria-current={i === idx ? "step" : undefined}>
          {STATUS_LABEL[s]}
        </li>
      ))}
    </ol>
  );
}

type Doc = { id: string; fileName: string; kind: string; size: number; createdAt: Date; visibleToClient?: boolean; uploadedBy?: { role: string } | null };

export function DocList({ docs, showVisibility = false, empty = "Brak dokumentów." }: { docs: Doc[]; showVisibility?: boolean; empty?: string }) {
  if (!docs.length) return <p className="muted small">{empty}</p>;
  return (
    <ul className="doc-list">
      {docs.map((d) => (
        <li key={d.id} className="doc-item">
          <Icon name="file" className="doc-item__icon" />
          <div className="doc-item__meta">
            <strong title={d.fileName}>{d.fileName}</strong>
            <span>
              {DOC_KINDS[d.kind as keyof typeof DOC_KINDS] ?? d.kind} · {fmtDate(d.createdAt)} · {fmtSize(d.size)}
              {d.uploadedBy && ` · dodał: ${d.uploadedBy.role === "ADMIN" ? "doradca" : "klient"}`}
              {showVisibility && !d.visibleToClient && " · tylko wewnętrzny"}
            </span>
          </div>
          <a className="btn btn--ghost btn--sm" href={`/api/pliki/${d.id}`} aria-label={`Pobierz ${d.fileName}`}>
            <Icon name="download" size={18} />
          </a>
        </li>
      ))}
    </ul>
  );
}

export function PageHead({ title, sub, actions }: { title: string; sub?: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <div className="app-page-head">
      <div>
        <h1>{title}</h1>
        {sub && <p>{sub}</p>}
      </div>
      {actions && <div className="btn-row">{actions}</div>}
    </div>
  );
}
