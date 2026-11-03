import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { PageHead, fmtDateTime } from "@/components/app/ui";
import { Icon } from "@/components/Icon";

export const metadata = { title: "Aktualności" };

export default async function PostsAdmin({ searchParams }: { searchParams: Promise<{ usunieto?: string }> }) {
  await requireAdmin();
  const posts = await db.post.findMany({ orderBy: [{ updatedAt: "desc" }] });
  const sp = await searchParams;
  const now = new Date();
  return (
    <>
      <PageHead
        title="Aktualności"
        sub="Wpisy na blogu – widoczne na stronie /aktualnosci/ i na stronie głównej."
        actions={
          <Link className="btn" href="/admin/aktualnosci/nowy/">
            <Icon name="plus" size={18} /> Nowy wpis
          </Link>
        }
      />
      {sp.usunieto && (
        <div className="alert alert--ok" style={{ marginBottom: 16 }}>
          <Icon name="checkCircle" />
          <p>Wpis został usunięty.</p>
        </div>
      )}
      <div className="panel">
        {posts.length ? (
          <table className="data-table">
            <thead>
              <tr>
                <th>Tytuł</th>
                <th>Status</th>
                <th>Publikacja</th>
                <th>Ostatnia zmiana</th>
              </tr>
            </thead>
            <tbody>
              {posts.map((p) => {
                const scheduled = p.status === "PUBLISHED" && p.publishedAt && p.publishedAt > now;
                return (
                  <tr key={p.id}>
                    <td>
                      <Link className="row-link" href={`/admin/aktualnosci/${p.id}/`}>
                        {p.title}
                      </Link>
                      <div className="muted small">/aktualnosci/{p.slug}/</div>
                    </td>
                    <td>
                      {p.status !== "PUBLISHED" ? (
                        <span className="badge">szkic</span>
                      ) : scheduled ? (
                        <span className="badge badge--warn">zaplanowany</span>
                      ) : (
                        <span className="badge badge--ok">opublikowany</span>
                      )}
                    </td>
                    <td>{fmtDateTime(p.publishedAt)}</td>
                    <td>{fmtDateTime(p.updatedAt)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <div className="empty">
            <h3>Nie ma jeszcze wpisów</h3>
            <p>Dodaj pierwszy wpis – np. o cenach energii na kolejny rok lub terminach wypowiedzeń umów.</p>
            <Link className="btn" href="/admin/aktualnosci/nowy/">
              Napisz wpis
            </Link>
          </div>
        )}
      </div>
    </>
  );
}
