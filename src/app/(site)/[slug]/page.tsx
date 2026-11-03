import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CATEGORIES, categoryOf, type ServicePage } from "@/lib/content";
import { getCategoryPage, getServicePage, getSiteSettings, type CategoryContent } from "@/lib/cms";
import type { Category } from "@/lib/content";
import { Breadcrumbs, CtaButtons, FaqList, PortalModule, RichBody } from "@/components/site/blocks";
import { JsonLd, faqLd, serviceLd } from "@/components/site/JsonLd";
import { LeadForm } from "@/components/site/LeadForm";
import { Banner, type BannerKey } from "@/components/site/Banner";
import { Icon } from "@/components/Icon";
import { ctaLabel, ctaTarget } from "@/lib/cta";
import { plain } from "@/lib/markdown";
import { SITE } from "@/lib/site";

// true: strony mogą być odświeżane po zmianach w panelu (nieznane adresy i tak dostają 404 przez notFound())
export const dynamicParams = true;
// Strony są generowane statycznie i odświeżane po zmianach w panelu (Treści) – najpóźniej co 5 minut.
export const revalidate = 300;

export function generateStaticParams() {
  return [...CATEGORIES.map((c) => ({ slug: c.slug })), ...CATEGORIES.flatMap((c) => c.services.map((s) => ({ slug: s.slug })))];
}

function titleFor(meta: string | null, fallback: string): Metadata["title"] {
  const t = meta || fallback;
  return /\|\s*Energia|Energia w Biznesie/.test(t) ? { absolute: t } : t;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const cp = await getCategoryPage(slug);
  if (cp) {
    const c = cp.content;
    const description = c.metaDescription ?? (plain(c.lead ?? c.short) + " " + c.short).slice(0, 160);
    return {
      title: titleFor(c.metaTitle, c.h1),
      description,
      alternates: { canonical: `/${cp.slug}/` },
      openGraph: { title: c.h1, description, images: [cp.image], url: `/${cp.slug}/` },
    };
  }
  const page = await getServicePage(slug);
  if (!page) return {};
  const description = page.metaDescription ?? plain(page.lead ?? page.h1);
  return {
    title: titleFor(page.metaTitle, page.h1),
    description,
    keywords: page.keywords,
    alternates: { canonical: `/${page.slug}/` },
    openGraph: { title: page.metaTitle ?? page.h1, description, url: `/${page.slug}/`, images: [categoryOf(page).image] },
  };
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const cp = await getCategoryPage(slug);
  if (cp) return <CategoryView cat={cp} content={cp.content} />;
  const page = await getServicePage(slug);
  if (page) return <ServiceView page={page} responseTime={(await getSiteSettings()).responseTime} />;
  notFound();
}

/* ------------------------------------------------------------------ usługa */

function ServiceView({ page, responseTime }: { page: ServicePage; responseTime: string }) {
  const cat = categoryOf(page);
  const navName = cat.services.find((s) => s.slug === page.slug)?.name ?? page.name;
  const heroCtas = page.ctas.length ? page.ctas : ["UMÓW ROZMOWĘ Z DORADCĄ"];
  const contactCta = page.ctas.find((c) => ctaTarget(c).kind === "contact");
  const leadType = contactCta && /FAKTUR|PRZEŚLIJ/i.test(contactCta) ? "ANALIZA" : "ROZMOWA";
  const idx = cat.services.findIndex((s) => s.slug === page.slug);
  const next = cat.services[(idx + 1) % cat.services.length];

  return (
    <>
      <section className="page-hero">
        <div className="container">
          <Breadcrumbs items={[{ name: cat.name, path: `/${cat.slug}/` }, { name: navName, path: `/${page.slug}/` }]} />
          <div className="page-hero__grid">
            <div>
              <span className="eyebrow">{cat.name}</span>
              <h1>{page.h1}</h1>
              {page.lead && <p className="lead">{page.lead}</p>}
              <CtaButtons ctas={heroCtas} slug={page.slug} max={2} size="btn--lg" />
            </div>
            <div className="page-hero__art">
              <img src={cat.image} alt="" width={300} height={340} />
            </div>
          </div>
        </div>
      </section>

      <section className="section section--white" style={{ paddingTop: 72 }}>
        <div className="container article-layout">
          <article>
            <RichBody body={page.body} slug={page.slug} />
            {page.tagline && (
              <div className="cta-band">
                <p>{page.tagline}</p>
                <CtaButtons ctas={heroCtas} slug={page.slug} />
              </div>
            )}
            {page.faq.length > 0 && (
              <section aria-labelledby="faq" style={{ marginTop: 64 }}>
                <span className="eyebrow">FAQ</span>
                <h2 id="faq">Najczęściej zadawane pytania</h2>
                <FaqList items={page.faq} />
                <JsonLd data={faqLd(page.faq)} />
              </section>
            )}
          </article>

          <aside className="article-aside" aria-label="Kontakt i powiązane usługi">
            <div className="card" style={{ background: "var(--cream)", boxShadow: "none" }}>
              <h2 style={{ fontSize: 20 }}>{leadType === "ANALIZA" ? "Prześlij fakturę do analizy" : "Porozmawiaj z doradcą"}</h2>
              <p className="muted small">Odpowiemy {responseTime}. Pierwsza konsultacja nie zobowiązuje.</p>
              <LeadForm compact showTypes={false} defaultType={leadType} topic={navName} />
            </div>
            <div className="card card--flat card--pad-sm">
              <h2 style={{ fontSize: 16, padding: "0 12px" }}>{cat.name}</h2>
              <ul className="side-list">
                {cat.services.map((s) => (
                  <li key={s.slug}>
                    <Link href={`/${s.slug}/`} aria-current={s.slug === page.slug ? "page" : undefined}>
                      {s.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </aside>
        </div>
      </section>

      {cat.module && cat.id !== 10 && <PortalModule {...cat.module} slug={page.slug} />}

      <section className="section--tight">
        <div className="container" style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap", alignItems: "center" }}>
          <Link href={`/${cat.slug}/`} className="link-arrow">
            <Icon name="arrowLeft" size={18} /> Wszystkie usługi: {cat.name}
          </Link>
          {next && next.slug !== page.slug && (
            <Link href={`/${next.slug}/`} className="link-arrow">
              Następna usługa: {next.name} <Icon name="arrowRight" size={18} />
            </Link>
          )}
        </div>
      </section>

      <JsonLd data={serviceLd({ name: page.h1, description: page.metaDescription ?? plain(page.lead ?? ""), path: `/${page.slug}/`, category: cat.name })} />
    </>
  );
}

/* ---------------------------------------------------------------- kategoria */

/** Grafiki z materiałów przypisane do kategorii – pokazywane w całości. */
const CATEGORY_BANNER: Partial<Record<number, BannerKey>> = { 1: "rozwiazania", 7: "spoldzielnie", 9: "doradca" };

async function CategoryView({ cat, content: p }: { cat: Category; content: CategoryContent }) {
  const heroCtas = p.ctas.length ? p.ctas : ["UMÓW ROZMOWĘ Z DORADCĄ"];
  const services = await Promise.all(cat.services.map((s) => getServicePage(s.slug)));
  const faq = services
    .map((s) => s?.faq[0])
    .filter((f): f is NonNullable<typeof f> => !!f)
    .slice(0, 6);
  return (
    <>
      <section className="page-hero">
        <div className="container">
          <Breadcrumbs items={[{ name: cat.name, path: `/${cat.slug}/` }]} />
          <div className="page-hero__grid">
            <div>
              <span className="eyebrow">Usługi dla firm</span>
              <h1>{p.h1}</h1>
              {p.lead && <p className="lead">{p.lead}</p>}
              <CtaButtons ctas={heroCtas} slug={cat.slug} max={2} size="btn--lg" />
            </div>
            <div className="page-hero__art">
              <img src={cat.image} alt="" width={300} height={340} />
            </div>
          </div>
          {CATEGORY_BANNER[cat.id] && (
            <div style={{ marginTop: 48, maxWidth: CATEGORY_BANNER[cat.id] === "doradca" ? 640 : undefined, marginInline: "auto" }}>
              <Banner name={CATEGORY_BANNER[cat.id]!} />
            </div>
          )}
        </div>
      </section>

      <section className="section section--white" style={{ paddingTop: 72 }}>
        <div className="container">
          <div className="article-layout" style={{ gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)" }}>
            <div>
              <span className="eyebrow">Zakres usług</span>
              <h2>{cat.services.length} obszarów, w których pomagamy</h2>
              <RichBody body={p.body.replace(/\{\{(cta|callout)\|[^}]+\}\}\n?/g, "")} slug={cat.slug} />
            </div>
            <div className="grid" style={{ gap: 12 }}>
              {cat.services.map((s, i) => {
                const sp = services[i];
                return (
                  <Link key={s.slug} href={`/${s.slug}/`} className="service-tile">
                    <span>
                      {s.name}
                      {sp?.lead && <small>{sp.lead}</small>}
                    </span>
                    <Icon name="arrowRight" />
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {cat.module && cat.id !== 10 && <PortalModule {...cat.module} slug={cat.slug} />}

      {faq.length > 0 && (
        <section className="section" aria-labelledby="faq">
          <div className="container" style={{ maxWidth: 880 }}>
            <div className="section-head section-head--center">
              <span className="eyebrow">FAQ</span>
              <h2 id="faq">Pytania, które zadają przedsiębiorcy</h2>
            </div>
            <FaqList items={faq} />
            <JsonLd data={faqLd(faq)} />
          </div>
        </section>
      )}

      <ContactBand topic={cat.name} />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "ItemList",
          name: cat.name,
          itemListElement: cat.services.map((s, i) => ({ "@type": "ListItem", position: i + 1, name: s.name, url: `${SITE.url}/${s.slug}/` })),
        }}
      />
    </>
  );
}

function ContactBand({ topic }: { topic: string }) {
  const href = `/kontakt/?typ=rozmowa&temat=${encodeURIComponent(topic)}`;
  return (
    <section className="section--tight section--dark">
      <div className="container" style={{ display: "flex", gap: 24, alignItems: "center", justifyContent: "space-between", flexWrap: "wrap" }}>
        <div style={{ maxWidth: 640 }}>
          <h2 style={{ marginBottom: 8 }}>
            Nie wiesz, od czego zacząć<span className="dot">?</span>
          </h2>
          <p className="lead" style={{ margin: 0 }}>
            Prześlij fakturę lub umów rozmowę – doradca wskaże, które działania mają sens w Twojej firmie.
          </p>
        </div>
        <div className="btn-row">
          <Link className="btn btn--lg btn--light" href="/kontakt/?typ=analiza">
            Prześlij fakturę
          </Link>
          <Link className="btn btn--lg" href={href}>
            {ctaLabel("UMÓW ROZMOWĘ Z DORADCĄ")} <Icon name="arrowRight" size={18} className="arrow" />
          </Link>
        </div>
      </div>
    </section>
  );
}
