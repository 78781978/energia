import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { mediaUrl } from "@/lib/storage";
import { PageHead } from "@/components/app/ui";
import { PostForm } from "@/components/app/CmsForms";
import { deletePost } from "@/app/actions/cms";
import { Icon } from "@/components/Icon";
import { ConfirmAction } from "@/components/app/ConfirmAction";

export const metadata = { title: "Edycja wpisu" };

/** Data w formacie pola datetime-local (czas lokalny serwera). */
function localInput(d: Date | null) {
  if (!d) return "";
  const z = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return z.toISOString().slice(0, 16);
}

export default async function EditPost({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ zapisano?: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const p = await db.post.findUnique({ where: { id }, include: { cover: true } });
  if (!p) notFound();
  const sp = await searchParams;
  return (
    <>
      <p className="small" style={{ marginBottom: 8 }}>
        <Link href="/admin/aktualnosci/">← Aktualności</Link>
      </p>
      <PageHead
        title={p.title}
        actions={
          <>
            {p.status === "PUBLISHED" && (
              <a className="btn btn--ghost" href={`/aktualnosci/${p.slug}/`} target="_blank" rel="noreferrer">
                <Icon name="eye" size={18} /> Zobacz wpis
              </a>
            )}
            <ConfirmAction action={deletePost} fields={{ id: p.id }} label={<><Icon name="trash" size={18} /> Usuń</>} confirm="Tak, usuń wpis" question="Wpis zniknie ze strony. Tej operacji nie można cofnąć." />
          </>
        }
      />
      {sp.zapisano && (
        <div className="alert alert--ok" style={{ marginBottom: 16 }}>
          <Icon name="checkCircle" />
          <p>Wpis został zapisany.</p>
        </div>
      )}
      <PostForm
        key={p.id}
        data={{
          id: p.id,
          title: p.title,
          slug: p.slug,
          excerpt: p.excerpt,
          body: p.body,
          status: p.status,
          publishedAt: localInput(p.publishedAt),
          metaTitle: p.metaTitle,
          metaDescription: p.metaDescription,
          cover: p.cover ? { url: mediaUrl(p.cover.storedName), alt: p.cover.alt } : null,
        }}
      />
    </>
  );
}
