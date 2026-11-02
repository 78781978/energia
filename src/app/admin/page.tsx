import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { requireAdmin } from "@/lib/auth";
import { ci, db } from "@/lib/db";
import { PageHead, StatusBadge, fmtDate } from "@/components/app/ui";
import { Icon } from "@/components/Icon";
import { ADMIN_VIEWS, APP_STATUSES, MEDIA, STATUS_LABEL } from "@/lib/constants";
import { normalizeDigits } from "@/lib/validators";

export const metadata = { title: "Wnioski" };

type SP = Promise<{ widok?: string; q?: string; status?: string; od?: string; do?: string; strona?: string }>;
const PAGE = 25;

export default async function AdminApplications({ searchParams }: { searchParams: SP }) {
  await requireAdmin();
  const sp = await searchParams;
  const view = ADMIN_VIEWS.find((v) => v.key === sp.widok) ?? ADMIN_VIEWS[0];
  const q = (sp.q ?? "").trim();
  const page = Math.max(1, Number(sp.strona) || 1);

  const where: Prisma.ApplicationWhereInput = {};
  if (view.statuses) where.status = { in: view.statuses };
  if (sp.status && (APP_STATUSES as readonly string[]).includes(sp.status)) where.status = sp.status;
  if (q) {
    const digits = normalizeDigits(q);
    where.OR = [
      { company: { name: ci(q) } },
      { number: { contains: q } },
      { user: { email: ci(q) } },
      ...(digits.length >= 3 ? [{ company: { nip: { contains: digits } } }] : []),
    ];
  }
  if (sp.od || sp.do) {
    where.createdAt = {
      ...(sp.od ? { gte: new Date(sp.od) } : {}),
      ...(sp.do ? { lte: new Date(`${sp.do}T23:59:59`) } : {}),
    };
  }

  const [apps, total, counts, stats] = await Promise.all([
    db.application.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE,
      take: PAGE,
      include: { company: true, user: { select: { email: true } }, _count: { select: { points: true, documents: true } } },
    }),
    db.application.count({ where }),
    db.application.groupBy({ by: ["status"], _count: true }),
    Promise.all([
      db.application.count({ where: { createdAt: { gte: new Date(Date.now() - 30 * 864e5) } } }),
      db.application.count({ where: { status: "OCZEKUJE_NA_PODPIS" } }),
      db.application.count({ where: { status: "AKTYWOWANA" } }),
      db.application.count({ where: { wantsCall: true, status: { in: ["WNIOSEK_UTWORZONY", "W_TRAKCIE_WERYFIKACJI"] } } }),
    ]),
  ]);
  const byStatus = Object.fromEntries(counts.map((c) => [c.status, c._count]));
  const viewCount = (statuses: string[] | null) =>
    statuses ? statuses.reduce((a, s) => a + (byStatus[s] ?? 0), 0) : counts.reduce((a, c) => a + c._count, 0);
  const qs = (patch: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    const merged = { widok: sp.widok, q: sp.q, status: sp.status, od: sp.od, do: sp.do, ...patch };
    for (const [k, v] of Object.entries(merged)) if (v) p.set(k, v);
    return `/admin/?${p.toString()}`;
  };

  return (
    <>
      <PageHead
        title="Wnioski"
        sub="Proces sprzedażowy – od nowego wniosku do aktywacji umowy."
        actions={
          <a className="btn btn--ghost" href={`/admin/eksport/?${new URLSearchParams(Object.entries(sp).filter(([, v]) => v) as [string, string][]).toString()}`}>
            <Icon name="download" size={18} /> Eksport CSV
          </a>
        }
      />
      <div className="stat-grid" style={{ marginBottom: 24 }}>
        <div className="stat">
          <div className="stat__label">Nowe wnioski (30 dni)</div>
          <div className="stat__value">{stats[0]}</div>
        </div>
        <div className="stat">
          <div className="stat__label">Oczekują na podpis</div>
          <div className="stat__value">{stats[1]}</div>
        </div>
        <div className="stat">
          <div className="stat__label">Aktywowane</div>
          <div className="stat__value">{stats[2]}</div>
        </div>
        <div className="stat">
          <div className="stat__label">Prośby o telefon</div>
          <div className="stat__value" style={{ color: stats[3] ? "var(--red-btn)" : undefined }}>
            {stats[3]}
          </div>
        </div>
      </div>

      <nav className="tabs" aria-label="Widoki">
        {ADMIN_VIEWS.map((v) => (
          <Link key={v.key} href={qs({ widok: v.key, status: undefined, strona: undefined })} aria-current={view.key === v.key ? "page" : undefined}>
            {v.label} <span className="n">{viewCount(v.statuses)}</span>
          </Link>
        ))}
      </nav>

      <form className="filters" method="get" action="/admin/">
        <input type="hidden" name="widok" value={view.key} />
        <div className="field">
          <label htmlFor="q">Szukaj (NIP, nazwa firmy, nr wniosku, e-mail)</label>
          <input id="q" className="input" name="q" defaultValue={q} placeholder="np. 5260250274 lub nazwa firmy" />
        </div>
        <div className="field">
          <label htmlFor="status">Status</label>
          <select id="status" className="select" name="status" defaultValue={sp.status ?? ""}>
            <option value="">Wszystkie</option>
            {APP_STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABEL[s]}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="od">Zgłoszenie od</label>
          <input id="od" className="input" type="date" name="od" defaultValue={sp.od} />
        </div>
        <div className="field">
          <label htmlFor="do">do</label>
          <input id="do" className="input" type="date" name="do" defaultValue={sp.do} />
        </div>
        <div className="btn-row">
          <button className="btn" type="submit">
            Filtruj
          </button>
          {(q || sp.status || sp.od || sp.do) && (
            <Link className="btn btn--ghost" href={`/admin/?widok=${view.key}`}>
              Wyczyść
            </Link>
          )}
        </div>
      </form>

      <div className="panel">
        {apps.length ? (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Wniosek</th>
                  <th>Firma / NIP</th>
                  <th>Media</th>
                  <th>PPE</th>
                  <th>Dok.</th>
                  <th>Zgłoszenie</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {apps.map((a) => (
                  <tr key={a.id}>
                    <td>
                      <Link className="row-link" href={`/admin/wnioski/${a.id}/`}>
                        {a.number}
                      </Link>
                      {a.wantsCall && (
                        <div className="small" style={{ color: "var(--red-btn)", display: "flex", gap: 4, alignItems: "center" }}>
                          <Icon name="phone" size={14} /> prosi o telefon
                        </div>
                      )}
                    </td>
                    <td>
                      <strong>{a.company.name}</strong>
                      <div className="muted small">
                        NIP {a.company.nip} · {a.user.email}
                      </div>
                    </td>
                    <td>{MEDIA[a.media as keyof typeof MEDIA]}</td>
                    <td>{a._count.points}</td>
                    <td>{a._count.documents}</td>
                    <td>{fmtDate(a.createdAt)}</td>
                    <td>
                      <StatusBadge status={a.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty">
            <img src="/img/3d/brak-ofert.png" alt="" width={160} height={142} />
            <h3>Brak wniosków</h3>
            <p>Zmień filtry lub widok.</p>
          </div>
        )}
        {total > PAGE && (
          <div className="btn-row" style={{ justifyContent: "space-between", marginTop: 16, alignItems: "center" }}>
            <span className="muted small">
              {(page - 1) * PAGE + 1}–{Math.min(page * PAGE, total)} z {total}
            </span>
            <div className="btn-row">
              {page > 1 && (
                <Link className="btn btn--ghost btn--sm" href={qs({ strona: String(page - 1) })}>
                  Poprzednia
                </Link>
              )}
              {page * PAGE < total && (
                <Link className="btn btn--ghost btn--sm" href={qs({ strona: String(page + 1) })}>
                  Następna
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
