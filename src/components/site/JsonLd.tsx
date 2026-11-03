import { SITE } from "@/lib/site";
import type { SiteSettings } from "@/lib/cms";
import type { Faq } from "@/lib/content";
import { plain } from "@/lib/markdown";

export function JsonLd({ data }: { data: object }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }} />;
}

export function organizationLd(st: SiteSettings) {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${SITE.url}/#organizacja`,
    name: st.legalName ?? SITE.brand,
    alternateName: [SITE.brand, SITE.portalBrand],
    url: SITE.url,
    logo: `${SITE.url}/brand/logo-biznes.png`,
    description: SITE.description,
    ...(st.email ? { email: st.email } : {}),
    ...(st.phone ? { telephone: st.phone } : {}),
    ...(st.nip ? { vatID: `PL${st.nip.replace(/\D/g, "")}` } : {}),
    areaServed: { "@type": "Country", name: "Polska" },
    ...(st.linkedin || st.facebook ? { sameAs: [st.linkedin, st.facebook].filter(Boolean) } : {}),
  };
}

export function breadcrumbLd(items: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({ "@type": "ListItem", position: i + 1, name: it.name, item: `${SITE.url}${it.path}` })),
  };
}

export function serviceLd(opts: { name: string; description: string; path: string; category: string }) {
  return {
    "@context": "https://schema.org",
    "@type": "Service",
    name: opts.name,
    description: opts.description,
    serviceType: opts.category,
    url: `${SITE.url}${opts.path}`,
    provider: { "@id": `${SITE.url}/#organizacja` },
    areaServed: { "@type": "Country", name: "Polska" },
    audience: { "@type": "BusinessAudience", name: "Przedsiębiorstwa i instytucje" },
  };
}

export function faqLd(faq: Faq[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faq.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: plain(f.a) } })),
  };
}
