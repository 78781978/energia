import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { DocList, PageHead, StatusBadge, fmtDate, fmtDateTime } from "@/components/app/ui";
import { CompanyForm } from "@/components/app/CompanyForm";
import { companyDraft, pointDrafts } from "@/lib/drafts";
import { toggleUserActive } from "@/app/actions/admin";

export const metadata = { title: "Karta klienta" };

export default async function ClientCard({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const user = await db.user.findUnique({
    where: { id },
    include: {
      companies: { include: { points: { orderBy: { createdAt: "asc" } } } },
      applications: { orderBy: { createdAt: "desc" }, include: { company: { select: { name: true } } } },
    },
  });
  if (!user || user.role !== "CLIENT") notFound();
  const docs = await db.document.findMany({
    where: { OR: [{ application: { userId: id } }, { company: { ownerId: id } }] },
    orderBy: { createdAt: "desc" },
    include: { uploadedBy: { select: { role: true } } },
  });
  return (
    <>
      <p className="small" style={{ marginBottom: 8 }}>
        <Link href="/admin/klienci/">← Klienci</Link>
      </p>
      <PageHead
        title={user.companies[0]?.name ?? user.email}
        sub={`Konto ${user.email} · rejestracja ${fmtDate(user.createdAt)} · ostatnie logowanie ${fmtDateTime(user.lastLoginAt)}`}
        actions={
          <form action={toggleUserActive}>
            <input type="hidden" name="userId" value={user.id} />
            <button className="btn btn--ghost btn--sm" type="submit">
              {user.isActive ? "Zablokuj konto" : "Odblokuj konto"}
            </button>
          </form>
        }
      />
      <div className="two-col">
        <div className="stack">
          {user.companies.map((c) => (
            <CompanyForm key={c.id} company={companyDraft(c, user)} points={pointDrafts(c.points)} mode="admin" />
          ))}
          {!user.companies.length && <div className="panel muted">Klient nie złożył jeszcze wniosku – brak danych firmy.</div>}
        </div>
        <div className="stack">
          <section className="panel">
            <div className="panel__head">
              <h2>Konto</h2>
            </div>
            <dl className="dl">
              <dt>E-mail</dt>
              <dd>{user.email}</dd>
              <dt>Imię i nazwisko</dt>
              <dd>{user.name ?? "–"}</dd>
              <dt>Telefon</dt>
              <dd>{user.phone ?? "–"}</dd>
              <dt>Zgoda marketingowa</dt>
              <dd>{user.marketingConsent ? "tak" : "nie"}</dd>
              <dt>Źródło</dt>
              <dd>{user.source ?? "–"}</dd>
              <dt>Status</dt>
              <dd>{user.isActive ? "aktywne" : "zablokowane"}</dd>
            </dl>
          </section>
          <section className="panel">
            <div className="panel__head">
              <h2>Wnioski</h2>
            </div>
            <ul className="side-list">
              {user.applications.map((a) => (
                <li key={a.id}>
                  <Link href={`/admin/wnioski/${a.id}/`} style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                    <span>
                      {a.number} <span className="muted small">· {fmtDate(a.createdAt)}</span>
                    </span>
                    <StatusBadge status={a.status} />
                  </Link>
                </li>
              ))}
            </ul>
            {!user.applications.length && <p className="muted small">Brak wniosków.</p>}
          </section>
          <section className="panel">
            <div className="panel__head">
              <h2>Dokumenty</h2>
            </div>
            <DocList docs={docs} showVisibility />
          </section>
        </div>
      </div>
    </>
  );
}
