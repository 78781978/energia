import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { getCategoryPage } from "@/lib/cms";
import { PageHead, fmtDateTime } from "@/components/app/ui";
import { CategoryContentForm } from "@/components/app/CmsForms";
import { resetPageContent } from "@/app/actions/cms";
import { Icon } from "@/components/Icon";
import { ConfirmAction } from "@/components/app/ConfirmAction";

export const metadata = { title: "Edycja kategorii" };

export default async function EditCategory({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ przywrocono?: string }> }) {
  await requireAdmin();
  const { slug } = await params;
  const cp = await getCategoryPage(slug);
  if (!cp) notFound();
  const sp = await searchParams;
  return (
    <>
      <p className="small" style={{ marginBottom: 8 }}>
        <Link href="/admin/tresci/">← Treści strony</Link>
      </p>
      <PageHead
        title={`Kategoria: ${cp.name}`}
        sub={cp.edited ? `Ostatnia zmiana: ${fmtDateTime(cp.edited)}` : "Treść oryginalna"}
        actions={
          <>
            <a className="btn btn--ghost" href={`/${slug}/`} target="_blank" rel="noreferrer">
              <Icon name="eye" size={18} /> Zobacz stronę
            </a>
            {cp.edited && (
              <ConfirmAction action={resetPageContent} fields={{ key: `kategoria:${slug}` }} label="Przywróć oryginał" confirm="Tak, przywróć" question="Wszystkie zmiany tej strony zostaną usunięte i wróci tekst z dokumentów." />
            )}
          </>
        }
      />
      {sp.przywrocono && (
        <div className="alert alert--ok" style={{ marginBottom: 16 }}>
          <Icon name="checkCircle" />
          <p>Przywrócono oryginalną treść kategorii.</p>
        </div>
      )}
      <CategoryContentForm key={`${slug}-${sp.przywrocono ?? ""}`} data={{ slug, ...cp.content }} />
    </>
  );
}
