import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { CATEGORIES } from "@/lib/content";
import { PageHead, fmtDateTime } from "@/components/app/ui";
import { Icon } from "@/components/Icon";

export const metadata = { title: "Treści strony" };

export default async function ContentOverview({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  await requireAdmin();
  const q = ((await searchParams).q ?? "").trim().toLowerCase();
  const rows = await db.pageContent.findMany({ select: { slug: true, updatedAt: true } });
  const edited = new Map(rows.map((r) => [r.slug, r.updatedAt]));
  const match = (t: string) => !q || t.toLowerCase().includes(q);
  return (
    <>
      <PageHead
        title="Treści strony"
        sub="Edytuj teksty 10 kategorii i 76 podstron usług. Zmiany pojawiają się na stronie od razu po zapisaniu."
        actions={
          <>
            <Link className="btn btn--ghost" href="/admin/aktualnosci/nowy/">
              <Icon name="plus" size={18} /> Nowy wpis w aktualnościach
            </Link>
          </>
        }
      />
      <div className="stat-grid" style={{ marginBottom: 24 }}>
        <Link href="/admin/aktualnosci/" className="stat" style={{ textDecoration: "none", color: "inherit" }}>
          <div className="stat__label">Aktualności</div>
          <div style={{ fontWeight: 700, marginTop: 6 }}>Wpisy na blogu →</div>
        </Link>
        <Link href="/admin/banery/" className="stat" style={{ textDecoration: "none", color: "inherit" }}>
          <div className="stat__label">Banery i grafiki</div>
          <div style={{ fontWeight: 700, marginTop: 6 }}>Podmień obrazy →</div>
        </Link>
        <Link href="/admin/ustawienia/" className="stat" style={{ textDecoration: "none", color: "inherit" }}>
          <div className="stat__label">Dane firmy</div>
          <div style={{ fontWeight: 700, marginTop: 6 }}>Telefon, adres, NIP →</div>
        </Link>
        <div className="stat">
          <div className="stat__label">Zmienione podstrony</div>
          <div className="stat__value">{rows.length}</div>
        </div>
      </div>
      <form method="get" className="filters" style={{ gridTemplateColumns: "1fr auto" }}>
        <div className="field">
          <label htmlFor="q">Szukaj podstrony</label>
          <input id="q" className="input" name="q" defaultValue={q} placeholder="np. moc umowna, PPA, fotowoltaika" />
        </div>
        <button className="btn" type="submit">
          Szukaj
        </button>
      </form>
      <div className="stack">
        {CATEGORIES.filter((c) => match(c.name) || c.services.some((s) => match(s.name))).map((c) => {
          const catEdited = edited.get(`kategoria:${c.slug}`);
          return (
            <section key={c.slug} className="panel">
              <div className="panel__head">
                <h2>
                  <Icon name={c.icon} size={20} /> {c.name}
                </h2>
                <div className="btn-row" style={{ alignItems: "center" }}>
                  {catEdited && <span className="badge badge--info">zmieniona {fmtDateTime(catEdited)}</span>}
                  <Link className="btn btn--ghost btn--sm" href={`/admin/tresci/kategoria/${c.slug}/`}>
                    Edytuj stronę kategorii
                  </Link>
                </div>
              </div>
              <ul className="side-list">
                {c.services
                  .filter((s) => match(s.name) || match(c.name))
                  .map((s) => {
                    const e = edited.get(s.slug);
                    return (
                      <li key={s.slug}>
                        <Link href={`/admin/tresci/usluga/${s.slug}/`} style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                          <span>{s.name}</span>
                          {e ? <span className="badge badge--info">zmieniona {fmtDateTime(e)}</span> : <span className="muted small">oryginał</span>}
                        </Link>
                      </li>
                    );
                  })}
              </ul>
            </section>
          );
        })}
      </div>
    </>
  );
}
