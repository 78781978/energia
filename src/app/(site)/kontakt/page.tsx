import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/site/blocks";
import Link from "next/link";
import { LeadForm } from "@/components/site/LeadForm";
import { CallbackForm } from "@/components/site/CallbackForm";
import { Icon } from "@/components/Icon";
import { SITE } from "@/lib/site";
import { getSiteSettings } from "@/lib/cms";
import { serviceName } from "@/lib/content";

export const metadata: Metadata = {
  title: "Kontakt – rozmowa z doradcą, analiza faktury i współpraca",
  description:
    "Zamów telefon od doradcy energetycznego, prześlij fakturę do analizy lub zadaj pytanie. Współpraca dla elektryków, księgowych i biur rachunkowych oraz szkolenia dla doradców.",
  alternates: { canonical: "/kontakt/" },
};

const COOP = [
  {
    icon: "plug" as const,
    t: "Elektrycy – podwykonawcy",
    d: "Realizuj zlecenia u naszych klientów i polecaj audyty firmom, z którymi pracujesz.",
    cta: "Zostań naszym partnerem",
    href: "/wspolpraca/#zgloszenie",
  },
  {
    icon: "file" as const,
    t: "Księgowi i biura rachunkowe",
    d: "Polecaj audyty energetyczne i analizę faktur swoim klientom – w zamian za wynagrodzenie.",
    cta: "Program partnerski",
    href: "/wspolpraca/",
  },
  {
    icon: "users" as const,
    t: "Zostań doradcą energetycznym",
    d: "Od 2017 roku szkolimy doradców energetycznych. Poznaj Akademię Energia Online i cennik szkoleń.",
    cta: "Zapisz się na szkolenie",
    href: "/akademia/",
  },
];

type SP = Promise<{ typ?: string; temat?: string; usluga?: string }>;

export default async function ContactPage({ searchParams }: { searchParams: SP }) {
  const st = await getSiteSettings();
  const sp = await searchParams;
  const typ = sp.typ === "rozmowa" ? "ROZMOWA" : sp.typ === "analiza" ? "ANALIZA" : "KONTAKT";
  const svc = sp.usluga ? serviceName(sp.usluga) : "";
  const topic = [svc, sp.temat]
    .filter(Boolean)
    .filter((v, i, a) => a.indexOf(v) === i)
    .join(" – ")
    .slice(0, 180);
  return (
    <>
      <section className="page-hero" id="klienci" style={{ paddingBottom: 112 }}>
        <div className="container">
          <Breadcrumbs items={[{ name: "Kontakt", path: "/kontakt/" }]} />
          <div className="article-layout article-layout--contact">
            <div>
              <span className="eyebrow">Kontakt dla klientów</span>
              <h1>
                Porozmawiajmy o energii w Twojej firmie<span className="dot">.</span>
              </h1>
              <p className="lead">Opisz sytuację albo prześlij fakturę. Doradca odpowie {st.responseTime}.</p>
              <nav className="contact-switch" aria-label="Rodzaj kontaktu">
                <a href="#klienci">Jestem klientem</a>
                <a href="#wspolpraca">Współpraca i szkolenia</a>
              </nav>
              <div style={{ marginTop: 28 }}>
                <CallbackForm topic={topic} />
              </div>
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
              <div className="grid" id="biuro" style={{ gap: 12, marginTop: 32, scrollMarginTop: 100 }}>
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
              {(st.legalName || st.nip || st.krs || st.address) && (
                <div id="dane" className="card card--flat" style={{ marginTop: 24, scrollMarginTop: 100 }}>
                  <h2 style={{ fontSize: 18, marginTop: 0 }}>Dane adresowe</h2>
                  <dl className="dl">
                    {st.legalName && (
                      <>
                        <dt>Firma</dt>
                        <dd>{st.legalName}</dd>
                      </>
                    )}
                    {st.address && (
                      <>
                        <dt>Adres</dt>
                        <dd>{st.address}</dd>
                      </>
                    )}
                    {st.nip && (
                      <>
                        <dt>NIP</dt>
                        <dd>{st.nip}</dd>
                      </>
                    )}
                    {st.krs && (
                      <>
                        <dt>KRS</dt>
                        <dd>{st.krs}</dd>
                      </>
                    )}
                  </dl>
                </div>
              )}
            </div>
            <div className="card" style={{ padding: 40 }}>
              <LeadForm defaultType={typ} topic={topic} />
            </div>
          </div>
        </div>
      </section>

      <section className="section section--white" id="wspolpraca" style={{ scrollMarginTop: 80 }}>
        <div className="container">
          <div className="section-head section-head--center">
            <span className="eyebrow">Kontakt w sprawie współpracy</span>
            <h2>
              Współpracuj z nami<span className="dot">.</span>
            </h2>
            <p className="lead">Elektrycy, księgowi, biura rachunkowe i przyszli doradcy energetyczni – zapraszamy do współpracy.</p>
          </div>
          <div className="grid grid-3">
            {COOP.map((c) => (
              <Link key={c.t} href={c.href} className="card coop-card" style={{ textDecoration: "none", color: "inherit" }}>
                <span className="icon-badge" style={{ marginBottom: 16 }}>
                  <Icon name={c.icon} />
                </span>
                <h3 style={{ fontSize: 22 }}>{c.t}</h3>
                <p className="muted">{c.d}</p>
                <span className="link-arrow">
                  {c.cta} <Icon name="arrowRight" size={18} />
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
