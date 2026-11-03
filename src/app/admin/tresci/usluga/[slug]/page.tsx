import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { categoryOf, getService } from "@/lib/content";
import { getServicePage } from "@/lib/cms";
import { PageHead, fmtDateTime } from "@/components/app/ui";
import { ServiceContentForm } from "@/components/app/CmsForms";
import { resetPageContent } from "@/app/actions/cms";
import { Icon } from "@/components/Icon";
import { ConfirmAction } from "@/components/app/ConfirmAction";

export const metadata = { title: "Edycja podstrony" };

export default async function EditService({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ przywrocono?: string }> }) {
  await requireAdmin();
  const { slug } = await params;
  const page = await getServicePage(slug);
  const base = getService(slug);
  if (!page || !base) notFound();
  const cat = categoryOf(base);
  const sp = await searchParams;
  return (
    <>
      <p className="small" style={{ marginBottom: 8 }}>
        <Link href="/admin/tresci/">← Treści strony</Link> · {cat.name}
      </p>
      <PageHead
        title={cat.services.find((s) => s.slug === slug)?.name ?? page.name}
        sub={page.edited ? `Ostatnia zmiana: ${fmtDateTime(page.edited)}` : "Treść oryginalna z dokumentów"}
        actions={
          <>
            <a className="btn btn--ghost" href={`/${slug}/`} target="_blank" rel="noreferrer">
              <Icon name="eye" size={18} /> Zobacz stronę
            </a>
            {page.edited && (
              <ConfirmAction action={resetPageContent} fields={{ key: slug }} label="Przywróć oryginał" confirm="Tak, przywróć" question="Wszystkie zmiany tej strony zostaną usunięte i wróci tekst z dokumentów." />
            )}
          </>
        }
      />
      {sp.przywrocono && (
        <div className="alert alert--ok" style={{ marginBottom: 16 }}>
          <Icon name="checkCircle" />
          <p>Przywrócono oryginalną treść podstrony.</p>
        </div>
      )}
      <ServiceContentForm
        key={`${slug}-${sp.przywrocono ?? ""}`}
        data={{
          slug,
          h1: page.h1,
          lead: page.lead,
          body: page.body,
          tagline: page.tagline,
          ctas: page.ctas,
          faq: page.faq,
          metaTitle: page.metaTitle,
          metaDescription: page.metaDescription,
          keywords: page.keywords,
        }}
      />
    </>
  );
}
