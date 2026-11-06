import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumbs, Dot, SectionHead } from "@/components/site/blocks";
import { LeadForm } from "@/components/site/LeadForm";
import { Icon } from "@/components/Icon";
import { PARTNER_COMMISSIONS, PARTNER_TRAINING } from "@/lib/akademia";

export const metadata: Metadata = {
  title: "Współpraca – program partnerski dla elektryków, księgowych i biur rachunkowych",
  description:
    "Polecaj audyty energetyczne i usługi Energia w Biznesie albo realizuj zlecenia jako podwykonawca. Program partnerski dla elektryków, księgowych i biur rachunkowych.",
  alternates: { canonical: "/wspolpraca/" },
};

const GROUPS = [
  {
    icon: "plug" as const,
    t: "Elektrycy",
    d: "Szukamy zaufanych elektryków do realizacji zleceń u naszych klientów. Możesz też polecać audyty i analizę kosztów firmom, u których pracujesz na co dzień.",
    tags: ["Podwykonawstwo", "Polecenia"],
  },
  {
    icon: "file" as const,
    t: "Księgowi i biura rachunkowe",
    d: "Widzisz faktury i umowy klientów, rozmawiasz z nimi o kosztach działalności. Poleć audyt energetyczny lub analizę faktur – resztą zajmie się nasz zespół.",
    tags: ["Polecenia", "Audyty"],
  },
  {
    icon: "users" as const,
    t: "Doradcy energetyczni",
    d: "Chcesz rozpocząć pracę w branży albo rozwinąć swoje kompetencje? Dołącz do Akademii Energia Online i współpracuj z doświadczonym zespołem.",
    tags: ["Szkolenia", "Współpraca"],
    href: "/akademia/",
  },
];

const STEPS = [
  { t: "Zgłoś się", d: "Wypełnij krótki formularz – oddzwonimy i opowiemy o zasadach współpracy." },
  { t: "Bezpłatne szkolenie wprowadzające", d: "Poznasz ofertę audytów i usług energetycznych oraz zasady polecania klientów." },
  { t: "Polecasz lub realizujesz zlecenia", d: "Przekazujesz kontakt do klienta albo wykonujesz zlecenie jako nasz podwykonawca." },
  { t: "Otrzymujesz wynagrodzenie", d: "Wynagrodzenie wypłacamy po opłaceniu usługi przez klienta, zgodnie z umową partnerską." },
];

export default function CooperationPage() {
  return (
    <>
      <section className="page-hero">
        <div className="container">
          <Breadcrumbs items={[{ name: "Kontakt", path: "/kontakt/" }, { name: "Współpraca", path: "/wspolpraca/" }]} />
          <span className="eyebrow">Współpraca</span>
          <h1 style={{ maxWidth: 920 }}>
            Rozwijajmy razem rynek doradztwa energetycznego<span className="dot">.</span>
          </h1>
          <p className="lead" style={{ maxWidth: 820 }}>
            Współpracujemy z elektrykami, księgowymi i biurami rachunkowymi – osobami, które na co dzień pomagają przedsiębiorcom. Polecaj nasze
            usługi i audyty energetyczne albo realizuj z nami zlecenia – w zamian za wynagrodzenie.
          </p>
          <div className="btn-row">
            <a className="btn btn--lg" href="#zgloszenie">
              Zostań naszym partnerem <Icon name="arrowRight" size={18} className="arrow" />
            </a>
            <Link className="btn btn--lg btn--secondary" href="/akademia/">
              Szkolenia dla doradców
            </Link>
          </div>
        </div>
      </section>

      <section className="section section--white">
        <div className="container">
          <SectionHead center eyebrow="Dla kogo" title={<Dot>Komu proponujemy współpracę</Dot>} />
          <div className="grid grid-3">
            {GROUPS.map((g) => (
              <div key={g.t} className="card coop-card">
                <span className="icon-badge" style={{ marginBottom: 16 }}>
                  <Icon name={g.icon} />
                </span>
                <h3 style={{ fontSize: 22 }}>{g.t}</h3>
                <p className="muted">{g.d}</p>
                <div className="coop-tags">
                  {g.tags.map((t) => (
                    <span key={t} className="badge">
                      {t}
                    </span>
                  ))}
                </div>
                {g.href && (
                  <Link className="link-arrow" href={g.href} style={{ marginTop: 16 }}>
                    Akademia Energia Online <Icon name="arrowRight" size={18} />
                  </Link>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <SectionHead center eyebrow="Jak to działa" title={<Dot>Współpraca w 4 krokach</Dot>} />
          <ol className="coop-steps">
            {STEPS.map((s, i) => (
              <li key={s.t} className="card">
                <span className="coop-steps__n">{i + 1}</span>
                <h3 style={{ fontSize: 19 }}>{s.t}</h3>
                <p className="muted" style={{ margin: 0 }}>
                  {s.d}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="section section--white">
        <div className="container grid grid-2" style={{ gap: 48, alignItems: "start" }}>
          <div>
            <span className="eyebrow">Wynagrodzenie</span>
            <h2>
              Przykładowy model wynagradzania partnerów<span className="dot">.</span>
            </h2>
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Rodzaj polecenia</th>
                    <th>Wynagrodzenie</th>
                  </tr>
                </thead>
                <tbody>
                  {PARTNER_COMMISSIONS.map((c) => (
                    <tr key={c.what}>
                      <td>{c.what}</td>
                      <td>
                        <strong>{c.fee}</strong>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="muted small">Wynagrodzenie wypłacamy po opłaceniu usługi przez klienta. Szczegóły określa umowa partnerska.</p>
          </div>
          <div className="card price-card price-card--free">
            <span className="eyebrow">{PARTNER_TRAINING.who}</span>
            <h3 style={{ fontSize: 24 }}>{PARTNER_TRAINING.name}</h3>
            <p className="price-card__price">{PARTNER_TRAINING.price}</p>
            <p className="muted">{PARTNER_TRAINING.desc}</p>
            <a className="btn" href="#zgloszenie">
              Zgłoś się do programu
            </a>
          </div>
        </div>
      </section>

      <section className="section" id="zgloszenie" style={{ scrollMarginTop: 80 }}>
        <div className="container article-layout article-layout--contact">
          <div>
            <span className="eyebrow">Zgłoszenie</span>
            <h2>
              Zostań naszym partnerem<span className="dot">.</span>
            </h2>
            <p className="lead">Zostaw kontakt – opowiemy o zasadach współpracy i odpowiemy na pytania.</p>
            <ul className="checklist" style={{ marginTop: 24 }}>
              <li>
                <Icon name="check" /> Bezpłatne szkolenie wprowadzające dla partnerów
              </li>
              <li>
                <Icon name="check" /> Jasne zasady wynagrodzenia w umowie partnerskiej
              </li>
              <li>
                <Icon name="check" /> Wsparcie doświadczonego zespołu doradców
              </li>
            </ul>
          </div>
          <div className="card" style={{ padding: 40 }}>
            <LeadForm
              defaultType="WSPOLPRACA"
              showTypes={false}
              topic="Program partnerski"
              option={{ label: "Jestem", options: ["Elektrykiem", "Księgowym", "Biurem rachunkowym", "Doradcą energetycznym", "Inną firmą"] }}
              submitLabel="Wyślij zgłoszenie"
              messagePlaceholder="Napisz kilka słów o sobie lub o swojej firmie (opcjonalnie)"
            />
          </div>
        </div>
      </section>
    </>
  );
}
