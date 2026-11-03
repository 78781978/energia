import Link from "next/link";
import { Icon } from "@/components/Icon";
import { ctaLabel, ctaTarget } from "@/lib/cta";
import { renderMarkdown, toBlocks } from "@/lib/markdown";
import type { Faq } from "@/lib/content";
import { JsonLd, breadcrumbLd } from "./JsonLd";
import { Banner } from "./Banner";

export function CtaButtons({ ctas, slug, max = 3, size = "" }: { ctas: string[]; slug?: string; max?: number; size?: string }) {
  const seen = new Set<string>();
  const items = ctas
    .map((c) => ({ raw: c, label: ctaLabel(c), target: ctaTarget(c, { slug }) }))
    .filter((c) => (seen.has(c.label) ? false : (seen.add(c.label), true)))
    .slice(0, max);
  return (
    <div className="btn-row">
      {items.map((c, i) => (
        <Link key={c.raw} href={c.target.href} className={`btn ${size} ${i === 0 ? "" : "btn--secondary"}`}>
          {c.label}
          {i === 0 && <Icon name="arrowRight" size={18} className="arrow" />}
        </Link>
      ))}
    </div>
  );
}

/** Treść podstrony: akapity + wstawki z przyciskami w miejscach wskazanych w materiałach. */
export function RichBody({ body, slug }: { body: string; slug?: string }) {
  return (
    <div className="prose">
      {toBlocks(body).map((b, i) =>
        b.type === "html" ? (
          <div key={i} dangerouslySetInnerHTML={{ __html: b.html }} />
        ) : (
          <div key={i} className={b.callout ? "cta-band" : "cta-band cta-band--plain"}>
            {b.callout && <p>{b.callout}</p>}
            {b.ctas.length > 0 && <CtaButtons ctas={b.ctas} slug={slug} />}
          </div>
        ),
      )}
    </div>
  );
}

export function FaqList({ items }: { items: Faq[] }) {
  return (
    <div className="faq">
      {items.map((f, i) => (
        <details key={i} open={i === 0}>
          <summary>
            {f.q}
            <Icon name="chevronDown" size={20} />
          </summary>
          <div className="faq__a" dangerouslySetInnerHTML={{ __html: renderMarkdown(f.a) }} />
        </details>
      ))}
    </div>
  );
}

export function Breadcrumbs({ items }: { items: { name: string; path: string }[] }) {
  const all = [{ name: "Strona główna", path: "/" }, ...items];
  return (
    <nav className="breadcrumbs" aria-label="Okruszki">
      <ol>
        {all.map((it, i) => (
          <li key={it.path}>
            {i === all.length - 1 ? <span aria-current="page">{it.name}</span> : <Link href={it.path}>{it.name}</Link>}
          </li>
        ))}
      </ol>
      <JsonLd data={breadcrumbLd(all)} />
    </nav>
  );
}

/** Wspólny moduł kategorii kierujący do portalu zakupu energii. */
export function PortalModule({ title, body, ctas, slug }: { title: string | null; body: string; ctas: string[]; slug?: string }) {
  const text = body.replace(/\{\{(cta|callout)\|[^}]+\}\}\n?/g, "").trim();
  return (
    <section className="section--tight" aria-labelledby="portal-module">
      <div className="container">
        <div className="card portal-module">
          <div>
            <span className="eyebrow">Portal Energia Online</span>
            <h2 id="portal-module" style={{ fontSize: "clamp(26px,3vw,36px)" }}>
              {title ?? "Kupuj energię online"}
            </h2>
            <div className="prose" dangerouslySetInnerHTML={{ __html: renderMarkdown(text) }} />
            <div style={{ marginTop: 16 }}>
              <CtaButtons ctas={ctas.length ? ctas : ["PORÓWNAJ OFERTY ONLINE"]} slug={slug} />
            </div>
          </div>
          {/* Grafika w całości, bez kadrowania */}
          <Banner name="kierunek" href="/portal/rejestracja/" label="Wejdź na portal Energia Online" />
        </div>
      </div>
    </section>
  );
}

export function SectionHead({ eyebrow, title, lead, center = false, id }: { eyebrow?: string; title: React.ReactNode; lead?: React.ReactNode; center?: boolean; id?: string }) {
  return (
    <div className={`section-head ${center ? "section-head--center" : ""}`}>
      {eyebrow && <span className="eyebrow">{eyebrow}</span>}
      <h2 id={id}>{title}</h2>
      {lead && <p className="lead">{lead}</p>}
    </div>
  );
}

/** Nagłówek z czerwoną kropką na końcu – motyw z logo i banerów. */
export function Dot({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <span className="dot">.</span>
    </>
  );
}
