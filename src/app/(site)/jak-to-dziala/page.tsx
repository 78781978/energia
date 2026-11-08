import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumbs, Dot, FaqList, SectionHead } from "@/components/site/blocks";
import { ProcessSteps } from "@/components/site/ProcessSteps";
import { Icon } from "@/components/Icon";
import { getService } from "@/lib/content";
import { STATUS_HELP, STATUS_LABEL, APP_STATUSES } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Jak działa zakup energii online – portal Energia Online",
  description:
    "Załóż bezpłatne konto, wybierz media, lata i model ceny, prześlij fakturę i zamów umowę na prąd lub gaz online. Zobacz, jak działa portal Energia Online.",
  alternates: { canonical: "/jak-to-dziala/" },
};

export default function HowItWorks() {
  const faq = (getService("prad-dla-firm-stala-cena")?.faq ?? []).concat(getService("gaz-dla-firm-zmiana-sprzedawcy")?.faq ?? []).slice(0, 5);
  const statuses = APP_STATUSES.filter((s) => s !== "ODRZUCONA");
  return (
    <>
      <section className="page-hero">
        <div className="container">
          <Breadcrumbs items={[{ name: "Jak to działa", path: "/jak-to-dziala/" }]} />
          <div className="page-hero__grid">
            <div>
              <span className="eyebrow">Portal Energia Online</span>
              <h1>
                Zakup energii online – prosto i przejrzyście<span className="dot">.</span>
              </h1>
              <p className="lead">
                Jedno konto firmowe, wiele punktów poboru i pełna historia dokumentów. Ofertę przygotowujemy na podstawie Twoich danych – a
                decyzję podejmujesz Ty.
              </p>
              <div className="btn-row">
                <Link className="btn btn--lg" href="/portal/wniosek/">
                  Załóż darmowe konto <Icon name="arrowRight" size={18} className="arrow" />
                </Link>
                <Link className="btn btn--lg btn--secondary" href="/kontakt/?typ=rozmowa">
                  Wolę porozmawiać z doradcą
                </Link>
              </div>
            </div>
            <div className="page-hero__art">
              <img src="/img/3d/porownanie.png" alt="" width={300} height={185} />
            </div>
          </div>
        </div>
      </section>

      <section className="section section--white">
        <div className="container">
          <SectionHead center eyebrow="Wniosek" title={<Dot>7 kroków do nowej umowy</Dot>} />
          <ProcessSteps />
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="grid grid-2" style={{ gap: 64, alignItems: "start" }}>
            <div>
              <span className="eyebrow">Po wysłaniu wniosku</span>
              <h2>
                Status sprawdzisz w każdej chwili<span className="dot">.</span>
              </h2>
              <p className="lead">
                W panelu klienta widzisz, na jakim etapie jest wniosek, pobierasz umowy i dokumenty PDF oraz otrzymujesz komunikaty od
                doradcy.
              </p>
              <div className="alert" style={{ marginTop: 24 }}>
                <Icon name="info" />
                <p>
                  <strong>Jak podpisujesz umowę?</strong>
                  Pobierasz przygotowaną umowę w PDF, podpisujesz ją (podpisem kwalifikowanym, zaufanym lub odręcznie) i przesyłasz w portalu.
                  Finalizacja umowy zależy od procedur sprzedawcy energii.
                </p>
              </div>
            </div>
            <ol className="timeline card" style={{ padding: 32 }}>
              {statuses.map((s) => (
                <li key={s}>
                  <strong style={{ fontSize: 16 }}>{STATUS_LABEL[s]}</strong>
                  <div className="muted">{STATUS_HELP[s]}</div>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      <section className="section section--white">
        <div className="container">
          <SectionHead center eyebrow="Co przygotować" title={<Dot>Dane, które przyspieszą ofertę</Dot>} />
          <div className="grid grid-3">
            {[
              { icon: "building" as const, t: "Dane firmy", d: "NIP, nazwa, adres siedziby i osoba kontaktowa. REGON jest opcjonalny." },
              { icon: "bolt" as const, t: "Punkty poboru (PPE)", d: "Numer PPE, adres, grupa taryfowa, roczne zużycie i moc umowna – znajdziesz je na fakturze." },
              { icon: "file" as const, t: "Faktura i pełnomocnictwo", d: "Ostatnia faktura (najlepiej z 12 miesięcy) i – jeśli potrzebne – pełnomocnictwo do zmiany sprzedawcy." },
            ].map((x) => (
              <div className="card card--flat" key={x.t}>
                <span className="icon-badge" style={{ marginBottom: 16 }}>
                  <Icon name={x.icon} />
                </span>
                <h3>{x.t}</h3>
                <p className="muted" style={{ margin: 0 }}>
                  {x.d}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {faq.length > 0 && (
        <section className="section">
          <div className="container" style={{ maxWidth: 880 }}>
            <SectionHead center eyebrow="FAQ" title={<Dot>Najczęstsze pytania</Dot>} />
            <FaqList items={faq} />
          </div>
        </section>
      )}
    </>
  );
}
