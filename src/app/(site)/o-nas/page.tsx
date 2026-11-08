import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumbs, Dot, SectionHead } from "@/components/site/blocks";
import { Banner } from "@/components/site/Banner";
import { Icon } from "@/components/Icon";

export const metadata: Metadata = {
  title: "O nas – doświadczenie w doradztwie energetycznym od 2012 roku",
  description:
    "Od 2012 roku wspieramy przedsiębiorców w zakupie energii elektrycznej i gazu. Energia w Biznesie łączy doświadczenie doradcze z portalem do zakupu energii online.",
  alternates: { canonical: "/o-nas/" },
};

const GOALS = [
  "Sprawniej porównywać i wybierać oferty zakupu energii elektrycznej i gazu.",
  "Uprościć i zautomatyzować procesy zakupowe.",
  "Oszczędzać czas związany z analizą ofert i formalnościami.",
  "Lepiej kontrolować koszty energii w przedsiębiorstwie.",
  "Uzyskać wsparcie w rozwiązywaniu problemów związanych z zakupem i obsługą energii.",
  "Podejmować świadome decyzje dotyczące wyboru sprzedawcy i warunków zakupu energii.",
];

const VALUES = [
  { t: "Jasno", d: "Tłumaczymy złożone decyzje prostym językiem.", icon: "info" as const },
  { t: "Sprawnie", d: "Pokazujemy następny krok i pomagamy działać.", icon: "arrowRight" as const },
  { t: "Wiarygodnie", d: "Oddzielamy ofertę od obietnicy i pokazujemy warunki.", icon: "shield" as const },
];

export default function AboutPage() {
  return (
    <>
      <section className="page-hero">
        <div className="container">
          <Breadcrumbs items={[{ name: "O nas", path: "/o-nas/" }]} />
          <div className="about-hero">
            <div>
              <span className="eyebrow">O nas</span>
              <h1 style={{ maxWidth: 900 }}>
                Doświadczenie, które przekładamy na realne oszczędności<span className="dot">.</span>
              </h1>
              <p className="lead" style={{ maxWidth: 860 }}>
                Od 2012 roku nasi doradcy zdobywają doświadczenie w branży energetycznej, wspierając przedsiębiorców w zakresie zakupu energii
                elektrycznej i gazu. Od lat specjalizujemy się w doradztwie energetycznym, pomagając firmom podejmować świadome decyzje
                zakupowe, optymalizować koszty oraz skutecznie poruszać się w dynamicznie zmieniającym się rynku energii.
              </p>
              <div className="btn-row">
                <Link className="btn btn--lg" href="/kontakt/?typ=rozmowa">
                  Porozmawiaj z doradcą <Icon name="arrowRight" size={18} className="arrow" />
                </Link>
                <Link className="btn btn--lg btn--secondary" href="/wspolpraca/">
                  Współpraca i szkolenia
                </Link>
              </div>
            </div>
            <figure className="about-portrait">
              <img
                src="/img/o-nas/doradca-portret.jpg"
                srcSet="/img/o-nas/doradca-portret-sm.jpg 561w, /img/o-nas/doradca-portret.jpg 1122w"
                sizes="(max-width: 900px) 100vw, 440px"
                width={1122}
                height={1402}
                fetchPriority="high"
                alt="Basia Krzyworzeka – doradca energetyczny Energia w Biznesie. Ludzie, pomysły i działanie; rozwój, inspiracja i realne efekty; wiedza, społeczność, partnerstwa, możliwości."
              />
            </figure>
          </div>
        </div>
      </section>

      <section className="section section--white">
        <div className="container grid grid-2" style={{ gap: 48, alignItems: "start" }}>
          <div className="prose">
            <p>
              Nasza firma od 9 lat koncentruje swoją działalność na sprzedaży energii elektrycznej i gazu, profesjonalnym doradztwie dla
              klientów biznesowych oraz szkoleniu osób, które chcą rozwijać swoje kompetencje w branży energetycznej.
            </p>
            <p>
              Przez lata zdobyliśmy praktyczną wiedzę i doświadczenie, które pozwalają nam wspierać przedsiębiorców nie tylko w wyborze
              odpowiedniej oferty energetycznej, ale również w rozwiązywaniu szerokiego zakresu problemów związanych z zakupem, kosztami
              i obsługą energii.
            </p>
            <h2>
              Dlaczego powstał nasz portal<span className="dot">?</span>
            </h2>
            <p>Portal powstał na bazie wieloletnich doświadczeń zdobytych podczas codziennej pracy z przedsiębiorcami i klientami biznesowymi.</p>
            <p>
              Zauważyliśmy, że proces zakupu energii elektrycznej i gazu często jest skomplikowany, czasochłonny i wymaga zaangażowania wielu
              osób. Firmy potrzebują nie tylko dostępu do ofert, ale przede wszystkim prostych narzędzi, które pomogą im podejmować właściwe
              decyzje i ograniczać koszty prowadzenia działalności.
            </p>
            <p>
              Dlatego stworzyliśmy portal, którego zadaniem jest automatyzacja procesów zakupowych oraz ułatwienie firmom zarządzania jednym
              z najważniejszych obszarów ich wydatków – energią.
            </p>
          </div>
          <div className="card card--flat" style={{ padding: 40 }}>
            <h2 style={{ fontSize: 24, marginTop: 0 }}>
              Co chcemy zapewnić naszym klientom<span className="dot">?</span>
            </h2>
            <p className="muted">Naszym celem jest dostarczenie przedsiębiorcom narzędzia, które pozwoli im:</p>
            <ul className="checklist">
              {GOALS.map((g) => (
                <li key={g}>
                  <Icon name="check" /> {g}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="grid grid-2" style={{ gap: 32 }}>
            <div className="card card--flat" style={{ padding: 40 }}>
              <img src="/brand/logo-biznes.svg" alt="energia w biznesie" width={220} height={61} style={{ width: 220, marginBottom: 24 }} />
              <h2 style={{ fontSize: 24 }}>Doradztwo dla przedsiębiorców</h2>
              <p className="muted">
                Audyt kosztów energii, optymalizacja dystrybucji, przyłącza, energia bierna, OZE, PPA, spółdzielnie energetyczne, umowy i
                serwis infrastruktury. Stała opieka Energia 360.
              </p>
              <Link className="link-arrow" href="/energia-360/">
                Poznaj Energia 360 <Icon name="arrowRight" size={18} />
              </Link>
            </div>
            <div className="card card--flat" style={{ padding: 40 }}>
              <img src="/brand/logo-online.svg" alt="energia online" width={220} height={61} style={{ width: 220, marginBottom: 24 }} />
              <h2 style={{ fontSize: 24 }}>Portal zakupowy</h2>
              <p className="muted">
                Konto firmowe, wniosek o ofertę na prąd i gaz, przesyłanie faktur, porównanie ofert, podpisywanie umów i śledzenie statusu – w
                jednym miejscu.
              </p>
              <Link className="link-arrow" href="/jak-to-dziala/">
                Jak działa portal <Icon name="arrowRight" size={18} />
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="section section--white">
        <div className="container" style={{ maxWidth: 880 }}>
          <span className="eyebrow">Nasze doświadczenie – Twoje możliwości</span>
          <h2>
            Łączymy doświadczenie doradcze z nowoczesną technologią<span className="dot">.</span>
          </h2>
          <div className="prose">
            <p>
              Wiemy, że energia elektryczna i gaz to jedne z istotnych kosztów funkcjonowania wielu przedsiębiorstw. Wiemy również, jak wiele
              problemów może pojawić się podczas wyboru sprzedawcy, negocjowania warunków umowy czy zarządzania zakupami energii.
            </p>
            <p>Dlatego łączymy wieloletnie doświadczenie doradcze z nowoczesnymi rozwiązaniami technologicznymi.</p>
            <p>
              Nie tworzymy portalu wyłącznie po to, aby prezentować oferty. Chcemy realnie wspierać firmy w podejmowaniu lepszych decyzji
              zakupowych, upraszczać procesy i pomagać im skuteczniej zarządzać kosztami energii.
            </p>
          </div>
          <div className="cta-band" style={{ marginTop: 32 }}>
            <p>
              <strong>
                Naszą misją jest sprawić, aby zakup energii elektrycznej i gazu był dla przedsiębiorców prostszy, bardziej przejrzysty i
                efektywniejszy.
              </strong>
            </p>
            <p className="muted" style={{ margin: 0, fontWeight: 400 }}>
              Wykorzystujemy doświadczenie zdobywane od 2012 roku, aby dostarczać rozwiązania odpowiadające na rzeczywiste potrzeby biznesu.
            </p>
          </div>
        </div>
      </section>

      <section className="section--tight">
        <div className="container">
          <SectionHead center eyebrow="Nasze usługi" title={<Dot>Wszystko, w czym pomagamy firmom</Dot>} />
          <Banner name="ilustracje" />
        </div>
      </section>

      <section className="section">
        <div className="container">
          <SectionHead center eyebrow="Charakter marki" title={<Dot>Jak pracujemy</Dot>} />
          <div className="grid grid-3">
            {VALUES.map((v) => (
              <div key={v.t} className="card">
                <span className="icon-badge" style={{ marginBottom: 16 }}>
                  <Icon name={v.icon} />
                </span>
                <h3 style={{ fontSize: 24 }}>{v.t}</h3>
                <p className="muted" style={{ margin: 0 }}>
                  {v.d}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section section--white">
        <div className="container" style={{ maxWidth: 820, textAlign: "center" }}>
          <span className="eyebrow">Zespół</span>
          <h2>
            Za każdą umową stoi doradca<span className="dot">.</span>
          </h2>
          <p className="lead">Prosty język, konkretne liczby i pełne warunki. Jeśli coś się nie opłaca – powiemy to wprost.</p>
          <div className="btn-row" style={{ justifyContent: "center" }}>
            <Link className="btn btn--lg" href="/kontakt/?typ=rozmowa">
              Porozmawiaj z doradcą <Icon name="arrowRight" size={18} className="arrow" />
            </Link>
            <Link className="btn btn--lg btn--secondary" href="/akademia/">
              Zostań doradcą energetycznym
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
