import { Breadcrumbs } from "@/components/site/blocks";
import type { LegalDoc } from "@/content/prawne";

/** Dokument prawny: nagłówek, spis paragrafów (z odnośnikami) i treść. */
export function LegalDocument({ doc, title, path, subtitle }: { doc: LegalDoc; title: string; path: string; subtitle: string[] }) {
  const list = (
    <ol>
      {doc.toc.map((t) => (
        <li key={t.id}>
          <a href={`#${t.id}`}>{t.t}</a>
        </li>
      ))}
    </ol>
  );
  return (
    <section className="page-hero">
      <div className="container legal-layout">
        <div className="legal-head">
          <Breadcrumbs items={[{ name: title, path }]} />
          <h1>{title}</h1>
          {subtitle.map((s) => (
            <p key={s} className={/^(Data|Projekt|Wersja)/.test(s) ? "muted small" : "lead"}>
              {s}
            </p>
          ))}
        </div>
        <nav className="legal-toc" aria-label="Spis treści">
          {/* telefon: spis zwinięty, komputer: zawsze widoczny obok treści */}
          <details className="legal-toc__m">
            <summary>Spis treści</summary>
            {list}
          </details>
          <div className="legal-toc__d">
            <p className="legal-toc__t">Spis treści</p>
            {list}
          </div>
        </nav>
        <article className="prose legal" dangerouslySetInnerHTML={{ __html: doc.html }} />
      </div>
    </section>
  );
}
