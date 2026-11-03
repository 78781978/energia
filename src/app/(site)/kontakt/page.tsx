import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/site/blocks";
import { LeadForm } from "@/components/site/LeadForm";
import { Icon } from "@/components/Icon";
import { SITE } from "@/lib/site";
import { getSiteSettings } from "@/lib/cms";
import { serviceName } from "@/lib/content";

export const metadata: Metadata = {
  title: "Kontakt – rozmowa z doradcą i analiza faktury",
  description: "Zamów rozmowę z doradcą energetycznym, prześlij fakturę do analizy lub zadaj pytanie. Energia w Biznesie – doradztwo i zakup energii online dla firm.",
  alternates: { canonical: "/kontakt/" },
};

type SP = Promise<{ typ?: string; temat?: string; usluga?: string }>;

export default async function ContactPage({ searchParams }: { searchParams: SP }) {
  const st = await getSiteSettings();
  const sp = await searchParams;
  const typ = sp.typ === "rozmowa" ? "ROZMOWA" : sp.typ === "analiza" ? "ANALIZA" : "KONTAKT";
  const svc = sp.usluga ? serviceName(sp.usluga) : "";
  const topic = [svc, sp.temat].filter(Boolean).filter((v, i, a) => a.indexOf(v) === i).join(" – ").slice(0, 180);
  return (
    <section className="page-hero" style={{ paddingBottom: 112 }}>
      <div className="container">
        <Breadcrumbs items={[{ name: "Kontakt", path: "/kontakt/" }]} />
        <div className="article-layout" style={{ gridTemplateColumns: "minmax(0,0.9fr) minmax(0,1.1fr)", alignItems: "start" }}>
          <div>
            <span className="eyebrow">Kontakt</span>
            <h1>
              Porozmawiajmy o energii w Twojej firmie<span className="dot">.</span>
            </h1>
            <p className="lead">Opisz sytuację albo prześlij fakturę. Doradca odpowie {st.responseTime}.</p>
            <ul className="checklist" style={{ marginTop: 32 }}>
              <li>
                <Icon name="check" /> Pierwsza analiza i rozmowa nie zobowiązują
              </li>
              <li>
                <Icon name="check" /> Pokazujemy pełne warunki, nie tylko cenę za MWh
              </li>
              <li>
                <Icon name="check" /> Nie obiecujemy oszczędności, których nie potrafimy wykazać
              </li>
            </ul>
            <div className="grid" style={{ gap: 12, marginTop: 32 }}>
              {st.phone && (
                <a className="service-tile" href={`tel:${st.phone.replace(/\s/g, "")}`}>
                  <span>
                    {st.phone}
                    <small>{st.openingHours}</small>
                  </span>
                  <Icon name="phone" />
                </a>
              )}
              {st.email && (
                <a className="service-tile" href={`mailto:${st.email}`}>
                  <span>
                    {st.email}
                    <small>Odpowiadamy w dni robocze</small>
                  </span>
                  <Icon name="mail" />
                </a>
              )}
              {st.address && (
                <div className="service-tile">
                  <span>
                    {st.legalName ?? SITE.brand}
                    <small>{st.address}</small>
                  </span>
                  <Icon name="building" />
                </div>
              )}
            </div>
          </div>
          <div className="card" style={{ padding: 40 }}>
            <LeadForm defaultType={typ} topic={topic} />
          </div>
        </div>
      </div>
    </section>
  );
}
