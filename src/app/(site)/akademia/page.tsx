import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumbs, Dot, SectionHead } from "@/components/site/blocks";
import { LeadForm } from "@/components/site/LeadForm";
import { Icon } from "@/components/Icon";
import { PARTNER_TRAINING, PRICE_NOTE, TRAINING_OPTIONS, TRAINING_PACKAGES } from "@/lib/akademia";

export const metadata: Metadata = {
  title: "Akademia Energia Online – szkolenie: zostań doradcą energetycznym",
  description:
    "Od 2017 roku szkolimy doradców energetycznych. Praktyczne szkolenie z doradztwa energetycznego: rynek energii i gazu, analiza faktur i ofert, obsługa klientów biznesowych.",
  alternates: { canonical: "/akademia/" },
};

const LEARN = [
  "Jak funkcjonuje rynek energii elektrycznej i gazu ziemnego.",
  "Jak analizować rachunki i oferty dostawców energii.",
  "Jak dobierać korzystne rozwiązania do potrzeb klientów.",
  "Jak profesjonalnie prowadzić rozmowy i budować długofalowe relacje biznesowe.",
  "Jak wygląda proces zmiany sprzedawcy energii.",
  "Jak rozwijać własną bazę klientów i budować pozycję eksperta.",
];

const WHY = [
  "Szkolimy nowych doradców energetycznych od 2017 roku.",
  "Stawiamy na praktyczną wiedzę i profesjonalne standardy obsługi.",
  "Pomagamy zdobyć umiejętności potrzebne do rozpoczęcia pracy.",
  "Po szkoleniu otrzymujesz certyfikat ukończenia szkolenia Akademii Energia Online.",
  "Zapraszamy do współpracy zarówno początkujących, jak i doświadczonych doradców.",
  "Tworzymy społeczność ludzi, którzy chcą rozwijać się w dynamicznej branży energetycznej.",
];

export default function AcademyPage() {
  return (
    <>
      <section className="page-hero">
        <div className="container">
          <Breadcrumbs items={[{ name: "Współpraca", path: "/wspolpraca/" }, { name: "Akademia Energia Online", path: "/akademia/" }]} />
          <span className="eyebrow">Akademia Energia Online</span>
          <h1 style={{ maxWidth: 920 }}>
            Zostań doradcą energetycznym. Rozwijaj się razem z nami<span className="dot">!</span>
          </h1>
          <p className="lead" style={{ maxWidth: 820 }}>
            <strong>Doświadczenie. Wiedza. Współpraca. Nowe możliwości.</strong> Jesteśmy doświadczonym zespołem doradców energetycznych, który od
            lat wspiera klientów w wyborze korzystnych rozwiązań w zakresie energii elektrycznej i gazu ziemnego.
          </p>
          <div className="btn-row">
            <a className="btn btn--lg" href="#zapisy">
              Zapisz się na szkolenie <Icon name="arrowRight" size={18} className="arrow" />
            </a>
            <Link className="btn btn--lg btn--secondary" href="/wspolpraca/#zgloszenie">
              Zostań naszym partnerem
            </Link>
          </div>
        </div>
      </section>

      <section className="section section--white">
        <div className="container grid grid-2" style={{ gap: 48, alignItems: "start" }}>
          <div className="prose">
            <p>
              <strong>Od 2017 roku szkolimy nowych doradców energetycznych</strong>, dzieląc się praktyczną wiedzą, doświadczeniem i sprawdzonymi
              metodami pracy. Naszym celem jest rozwijanie branży oraz przygotowywanie specjalistów, którzy świadczą usługi doradztwa
              energetycznego na najwyższym poziomie.
            </p>
            <h2>
              Zapraszamy do współpracy<span className="dot">!</span>
            </h2>
            <p>Chcesz rozpocząć karierę w branży energetycznej? A może już pracujesz z klientami i szukasz nowych możliwości rozwoju?</p>
            <p>
              Zapraszamy do współpracy zarówno doświadczonych doradców, jak i osoby, które dopiero chcą zdobyć wiedzę i rozpocząć swoją
              przygodę z doradztwem energetycznym.
            </p>
            <p>
              <strong>Nie musisz mieć wieloletniego doświadczenia. Liczą się chęci, zaangażowanie i gotowość do nauki.</strong>
            </p>
          </div>
          <div className="card card--flat" style={{ padding: 40 }}>
            <span className="eyebrow">Szkolenia od 1 do 5 dni</span>
            <h2 style={{ fontSize: 24, marginTop: 0 }}>Twój pierwszy krok do nowego zawodu</h2>
            <p className="muted">
              Przygotowaliśmy intensywne <strong>szkolenia z doradztwa energetycznego – od 1 do 5 dni</strong>, podczas których poznasz praktyczne
              aspekty pracy doradcy oraz zdobędziesz solidne podstawy do rozpoczęcia działalności w branży. Każde szkolenie kończy się{" "}
              <strong>certyfikatem ukończenia</strong>.
            </p>
            <p style={{ fontWeight: 600, marginBottom: 8 }}>Podczas szkolenia dowiesz się:</p>
            <ul className="checklist">
              {LEARN.map((l) => (
                <li key={l}>
                  <Icon name="check" /> {l}
                </li>
              ))}
            </ul>
            <p style={{ marginTop: 20, marginBottom: 0 }}>
              <strong>Uczysz się od praktyków, którzy na co dzień pracują z klientami i znają realia rynku energetycznego.</strong>
            </p>
          </div>
        </div>
      </section>

      <section className="section" id="cennik" style={{ scrollMarginTop: 80 }}>
        <div className="container">
          <SectionHead center eyebrow="Cennik" title={<Dot>Wybierz ścieżkę rozwoju</Dot>} lead={PRICE_NOTE || undefined} />
          <div className="price-grid">
            {TRAINING_PACKAGES.map((p) => (
              <div key={p.id} className={`card price-card${p.recommended ? " price-card--rec" : ""}`}>
                {p.recommended && <span className="price-card__flag">Rekomendowany</span>}
                <span className="eyebrow">{p.tier}</span>
                <h3>{p.name}</h3>
                <p className="price-card__meta">{p.meta}</p>
                <p className="price-card__price">
                  {p.price} <small>{p.per}</small>
                </p>
                <p className="muted">{p.desc}</p>
                <a className={`btn ${p.recommended ? "" : "btn--secondary"}`} href="#zapisy">
                  Zapisz się
                </a>
              </div>
            ))}
          </div>
          <div className="card price-card price-card--free price-card--wide">
            <div>
              <span className="eyebrow">{PARTNER_TRAINING.who}</span>
              <h3>{PARTNER_TRAINING.name}</h3>
              <p className="muted" style={{ margin: 0 }}>
                {PARTNER_TRAINING.desc}
              </p>
            </div>
            <div style={{ textAlign: "center" }}>
              <p className="price-card__price">{PARTNER_TRAINING.price}</p>
              <Link className="btn" href="/wspolpraca/#zgloszenie">
                Zostań partnerem
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="section section--white">
        <div className="container grid grid-2" style={{ gap: 48, alignItems: "start" }}>
          <div>
            <span className="eyebrow">Dlaczego my</span>
            <h2>
              Dlaczego warto do nas dołączyć<span className="dot">?</span>
            </h2>
            <ul className="checklist">
              {WHY.map((w) => (
                <li key={w}>
                  <Icon name="check" /> {w}
                </li>
              ))}
            </ul>
          </div>
          <div className="cta-band" style={{ margin: 0 }}>
            <p>Twoja przyszłość może zacząć się już dziś!</p>
            <p className="muted" style={{ fontWeight: 400 }}>
              Branża energetyczna to przestrzeń dla osób przedsiębiorczych, komunikatywnych i otwartych na nowe możliwości.
            </p>
            <p style={{ fontWeight: 600 }}>
              Zainwestuj kilka dni w swoją wiedzę. Zdobądź praktyczne umiejętności i certyfikat. Rozpocznij drogę do zostania profesjonalnym doradcą
              energetycznym.
            </p>
            <p className="muted" style={{ fontWeight: 400 }}>
              Dołącz do naszego zespołu i razem z nami buduj wyższy standard doradztwa energetycznego w Polsce.
            </p>
          </div>
        </div>
      </section>

      <section className="section" id="zapisy" style={{ scrollMarginTop: 80 }}>
        <div className="container article-layout article-layout--contact">
          <div>
            <span className="eyebrow">Zapisy</span>
            <h2>
              Zapisz się na szkolenie i rozpocznij współpracę<span className="dot">!</span>
            </h2>
            <p className="lead">Zostaw kontakt – prześlemy program, najbliższe terminy i szczegóły zapisu.</p>
            <Link className="link-arrow" href="/wspolpraca/">
              Jesteś elektrykiem lub księgowym? Zobacz program partnerski <Icon name="arrowRight" size={18} />
            </Link>
          </div>
          <div className="card" style={{ padding: 40 }}>
            <LeadForm
              defaultType="SZKOLENIE"
              showTypes={false}
              topic="Akademia Energia Online"
              option={{ label: "Wybrany pakiet", options: TRAINING_OPTIONS, defaultValue: TRAINING_OPTIONS[1] }}
              submitLabel="Zapisz się"
              messagePlaceholder="Pytania o program lub terminy (opcjonalnie)"
            />
          </div>
        </div>
      </section>
    </>
  );
}
