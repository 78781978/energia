import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumbs, Dot, SectionHead } from "@/components/site/blocks";
import { AdvisorSpotlight } from "@/components/site/AdvisorSpotlight";
import { Banner } from "@/components/site/Banner";
import { Icon } from "@/components/Icon";

export const metadata: Metadata = {
  title: "O nas – Energia w Biznesie i Energia Online",
  description:
    "Energia w Biznesie to doradztwo energetyczne dla przedsiębiorców, a Energia Online – portal do zakupu energii. Jasno, sprawnie i wiarygodnie.",
  alternates: { canonical: "/o-nas/" },
};

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
          <span className="eyebrow">O nas</span>
          <h1 style={{ maxWidth: 900 }}>
            Energia, która porządkuje biznes<span className="dot">.</span>
          </h1>
          <p className="lead">
            Łączymy doradztwo energetyczne z portalem do zakupu energii online. Dzięki temu przedsiębiorca może samodzielnie porównać oferty i
            zamówić umowę – albo oddać całą energię w ręce doradcy w ramach opieki Energia 360.
          </p>
        </div>
      </section>

      <section className="section section--white">
        <div className="container">
          <div className="grid grid-2" style={{ gap: 32 }}>
            <div className="card card--flat" style={{ padding: 40 }}>
              <img src="/brand/logo-biznes.png" alt="energia w biznesie" width={220} height={61} style={{ width: 220, marginBottom: 24 }} />
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
              <img src="/brand/logo-online.png" alt="energia online" width={220} height={61} style={{ width: 220, marginBottom: 24 }} />
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
        <div className="container grid grid-2" style={{ alignItems: "center", gap: 64 }}>
          <AdvisorSpotlight />
          <div>
            <span className="eyebrow">Zespół</span>
            <h2>
              Za każdą umową stoi doradca<span className="dot">.</span>
            </h2>
            <p className="lead">Prosty język, konkretne liczby i pełne warunki. Jeśli coś się nie opłaca – powiemy to wprost.</p>
            <Link className="btn btn--lg" href="/kontakt/?typ=rozmowa">
              Porozmawiaj z doradcą <Icon name="arrowRight" size={18} className="arrow" />
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
