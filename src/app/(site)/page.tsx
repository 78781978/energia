import type { Metadata } from "next";
import Link from "next/link";
import { CATEGORIES, featuredFaq } from "@/lib/content";
import { Dot, FaqList, SectionHead } from "@/components/site/blocks";
import { ProcessSteps } from "@/components/site/ProcessSteps";
import { NewsletterForm } from "@/components/site/NewsletterForm";
import { AdvisorSpotlight } from "@/components/site/AdvisorSpotlight";
import { JsonLd, faqLd } from "@/components/site/JsonLd";
import { Icon } from "@/components/Icon";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: { absolute: "Energia w Biznesie – prąd i gaz dla firm online, doradztwo energetyczne" },
  description: SITE.description,
  alternates: { canonical: "/" },
};

export default function HomePage() {
  const faq = featuredFaq(6);
  return (
    <>
      {/* 1. Hero */}
      <section className="hero">
        <div className="container hero__grid">
          <div>
            <span className="eyebrow">Portal zakupu energii i doradztwo dla firm</span>
            <h1>
              Lepsza energia
              <br />
              <span className="accent">dla Twojej firmy</span>
              <span className="dot">.</span>
            </h1>
            <p className="lead">
              Porównaj oferty dostawców, wybierz najlepszą dla siebie i załatw wszystko online – szybko i bez zbędnych formalności. A gdy
              potrzebujesz wsparcia, doradca Energia 360 jest obok.
            </p>
            <div className="btn-row">
              <Link className="btn btn--lg" href="/portal/rejestracja/">
                Porównaj oferty <Icon name="arrowRight" size={18} className="arrow" />
              </Link>
              <Link className="btn btn--lg btn--secondary" href="/kontakt/?typ=analiza">
                Prześlij fakturę
              </Link>
            </div>
            <div className="features-inline" role="list">
              <div role="listitem">
                <Icon name="search" size={28} />
                Porównanie
                <br />
                ofert
              </div>
              <div role="listitem">
                <Icon name="file" size={28} />
                Prosty
                <br />
                proces
              </div>
              <div role="listitem">
                <Icon name="clock" size={28} />
                Oszczędność
                <br />
                czasu
              </div>
            </div>
          </div>
          <div className="hero__media">
            <img
              src="/img/hero/spotlight.jpg"
              alt="Przedsiębiorca w czerwonym świetle reflektora wyróżniony spośród innych"
              width={736}
              height={1024}
              fetchPriority="high"
            />
            <div className="hero__badge">
              <span className="icon-badge icon-badge--sm">
                <Icon name="checkCircle" size={22} />
              </span>
              <span>
                <strong>Umowa na prąd i gaz online</strong>
                Bez spotkań z handlowcem – z doradcą, gdy go potrzebujesz.
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Wszystkie rozwiązania */}
      <section className="section section--white" aria-labelledby="uslugi">
        <div className="container">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 24, flexWrap: "wrap", marginBottom: 48 }}>
            <SectionHead
              id="uslugi"
              eyebrow="Usługi"
              title={
                <>
                  Wszystkie rozwiązania <span className="accent">energetyczne</span> w jednym miejscu<span className="dot">.</span>
                </>
              }
              lead="Wybierz obszar dopasowany do potrzeb Twojej firmy – od zakupu prądu i gazu, przez audyt kosztów, po OZE i serwis infrastruktury."
            />
          </div>
          <div className="grid grid-4" style={{ gap: 20 }}>
            {CATEGORIES.map((c) => (
              <Link key={c.slug} href={`/${c.slug}/`} className="cat-card">
                <div className="cat-card__img">
                  <img src={c.image} alt="" loading="lazy" width={140} height={185} />
                </div>
                <div className="cat-card__body">
                  <h3 className="cat-card__title">
                    <Icon name={c.icon} size={22} />
                    {c.name}
                  </h3>
                  <p>{c.short}</p>
                  <span className="cat-card__more">
                    {c.services.length} usług <Icon name="arrowRight" size={16} />
                  </span>
                </div>
              </Link>
            ))}
            <Link href="/kontakt/?typ=rozmowa" className="cat-card cat-card--wide" style={{ background: "var(--graphite)", color: "#fff" }}>
              <div className="cat-card__body" style={{ justifyContent: "center", padding: 40 }}>
                <img src="/img/3d/porownanie.png" alt="" width={200} height={123} style={{ width: 200, margin: "8px 0 16px" }} loading="lazy" />
                <h3 className="cat-card__title" style={{ color: "#fff" }}>
                  Nie wiesz, którą usługę wybrać?
                </h3>
                <p style={{ color: "#c9cbce" }}>Opisz sytuację – doradca podpowie, od czego zacząć.</p>
                <span className="cat-card__more" style={{ color: "#fff" }}>
                  Porozmawiaj z doradcą <Icon name="arrowRight" size={16} />
                </span>
              </div>
            </Link>
          </div>
          <div className="features-inline" style={{ maxWidth: 720, margin: "64px auto 0" }}>
            <div>
              <Icon name="tag" size={28} />
              Przejrzyste
              <br />
              warunki
            </div>
            <div>
              <Icon name="checkCircle" size={28} />
              Sprawdzeni
              <br />
              dostawcy
            </div>
            <div>
              <Icon name="leaf" size={28} />
              Proste i szybkie
              <br />
              wdrożenie
            </div>
          </div>
        </div>
      </section>

      {/* 3. Jak to działa */}
      <section className="section" aria-labelledby="jak">
        <div className="container">
          <SectionHead
            id="jak"
            center
            eyebrow="Jak to działa"
            title={<Dot>Od faktury do umowy w 7 krokach</Dot>}
            lead="Założenie konta jest bezpłatne. Wniosek wypełnisz w kilka minut – a jeśli nie znasz wszystkich danych, wystarczy faktura."
          />
          <ProcessSteps />
          <div className="btn-row" style={{ justifyContent: "center", marginTop: 48 }}>
            <Link className="btn btn--lg" href="/portal/rejestracja/">
              Załóż darmowe konto <Icon name="arrowRight" size={18} className="arrow" />
            </Link>
            <Link className="btn btn--lg btn--ghost" href="/jak-to-dziala/">
              Szczegóły procesu
            </Link>
          </div>
        </div>
      </section>

      {/* 4. Portal – nowy kierunek */}
      <section className="section--tight" aria-labelledby="portal">
        <div className="container">
          <div className="feature-banner">
            <div className="feature-banner__text">
              <img src="/brand/logo-online.png" alt="energia online" width={200} height={55} style={{ width: 200, marginBottom: 32 }} />
              <h2 id="portal">
                Nowy kierunek <span className="accent">dla Twojego biznesu</span>
                <span className="dot">.</span>
              </h2>
              <p className="tagline-caps" style={{ margin: "8px 0 24px" }}>
                Energia online.
                <br />
                Więcej możliwości.
              </p>
              <ul className="checklist">
                <li>
                  <Icon name="check" /> Oferty różnych sprzedawców porównane w jednym miejscu
                </li>
                <li>
                  <Icon name="check" /> Status wniosku, dokumenty i umowy zawsze pod ręką
                </li>
                <li>
                  <Icon name="check" /> Wiele punktów poboru (PPE) na jednym koncie firmy
                </li>
              </ul>
              <div className="btn-row">
                <Link className="btn btn--lg" href="/portal/rejestracja/">
                  Wejdź na portal <Icon name="arrowRight" size={18} className="arrow" />
                </Link>
              </div>
            </div>
            <div className="feature-banner__media">
              <img src="/img/hero/kierunek.jpg" alt="Samolot na czerwonym pasie startowym prowadzącym przez znak e w stronę miasta" loading="lazy" />
            </div>
          </div>
        </div>
      </section>

      {/* 5. Energia 360 – doradca */}
      <section className="section--tight" aria-labelledby="e360">
        <div className="container">
          <div className="feature-banner feature-banner--reverse">
            <div className="feature-banner__text">
              <span className="eyebrow">Energia 360</span>
              <h2 id="e360">
                Czy masz <span className="accent">doradcę,</span> który naprawdę dba o Twoje rachunki <span className="accent">za energię</span>?
              </h2>
              <p className="tagline-caps" style={{ margin: "8px 0 24px" }}>
                Realne wsparcie.
                <br />
                Korzystniejsze rozwiązania.
              </p>
              <p className="muted">
                W ramach opieki Energia 360 pilnujemy terminów umów, monitorujemy rynek, kontrolujemy faktury i negocjujemy warunki – a Ty
                skupiasz się na prowadzeniu firmy.
              </p>
              <div className="btn-row">
                <Link className="btn btn--lg" href="/energia-360/">
                  Poznaj Energia 360 <Icon name="arrowRight" size={18} className="arrow" />
                </Link>
                <Link className="btn btn--lg btn--secondary" href="/kontakt/?typ=rozmowa&temat=Energia%20360">
                  Umów rozmowę
                </Link>
              </div>
            </div>
            <div className="feature-banner__media">
              <img src="/img/hero/parasol.jpg" alt="Czerwony parasol wyróżniający się wśród czarnych parasoli" loading="lazy" />
            </div>
          </div>
        </div>
      </section>

      {/* 6. Spółdzielnie */}
      <section className="section--tight" aria-labelledby="spoldzielnie">
        <div className="container">
          <div className="feature-banner">
            <div className="feature-banner__text">
              <span className="eyebrow">Nowość dla firm i samorządów</span>
              <h2 id="spoldzielnie">
                Spółdzielnie <span className="accent">energetyczne</span>
                <span className="dot">.</span>
              </h2>
              <p className="tagline-caps" style={{ margin: "8px 0 24px" }}>
                Wspólna energia.
                <br />
                Większe możliwości.
              </p>
              <p className="muted">
                Pomagamy ocenić opłacalność, dobrać uczestników, przygotować dokumentację i rozliczać spółdzielnię. Sprawdź też, jak firma
                może zarabiać na elastyczności w programach DSR.
              </p>
              <div className="btn-row">
                <Link className="btn btn--lg" href="/spoldzielnie-energetyczne-i-dsr/">
                  Dowiedz się więcej <Icon name="arrowRight" size={18} className="arrow" />
                </Link>
              </div>
            </div>
            <div className="feature-banner__media">
              <img src="/img/hero/spoldzielnie.jpg" alt="Drewniane figurki idące razem czerwoną ścieżką w stronę turbin wiatrowych" loading="lazy" />
            </div>
          </div>
        </div>
      </section>

      {/* 7. Doradca */}
      <section className="section" aria-labelledby="doradca">
        <div className="container">
          <div className="grid grid-2" style={{ alignItems: "center", gap: 64 }}>
            <AdvisorSpotlight />
            <div>
              <span className="eyebrow">Twój doradca</span>
              <h2 id="doradca">
                Konkretny człowiek, nie infolinia<span className="dot">.</span>
              </h2>
              <p className="lead">
                Każda firma ma swojego doradcę energetycznego. Zna Twoje umowy, faktury i plany – i mówi prostym językiem.
              </p>
              <ul className="checklist">
                <li>
                  <Icon name="check" /> Tłumaczymy złożone decyzje prostym językiem
                </li>
                <li>
                  <Icon name="check" /> Pokazujemy następny krok i pomagamy działać
                </li>
                <li>
                  <Icon name="check" /> Oddzielamy ofertę od obietnicy i pokazujemy pełne warunki
                </li>
              </ul>
              <Link className="btn btn--lg" href="/kontakt/?typ=rozmowa">
                Zamów rozmowę z doradcą <Icon name="arrowRight" size={18} className="arrow" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 8. FAQ */}
      {faq.length > 0 && (
        <section className="section section--white" aria-labelledby="faq">
          <div className="container" style={{ maxWidth: 880 }}>
            <SectionHead id="faq" center eyebrow="FAQ" title={<Dot>Pytania przedsiębiorców</Dot>} />
            <FaqList items={faq} />
            <JsonLd data={faqLd(faq)} />
          </div>
        </section>
      )}

      {/* 9. Newsletter + CTA */}
      <section className="section--tight section--dark">
        <div className="container grid grid-2" style={{ alignItems: "center", gap: 48 }}>
          <div>
            <h2>
              Prześlij fakturę<span className="dot">.</span> Porównamy warunki zakupu energii<span className="dot">.</span>
            </h2>
            <p className="lead">Analiza faktury jest pierwszym krokiem – bez zobowiązań. Zobaczysz, co można zmienić i ile to wymaga pracy.</p>
            <div className="btn-row">
              <Link className="btn btn--lg btn--light" href="/kontakt/?typ=analiza">
                Prześlij fakturę
              </Link>
              <Link className="btn btn--lg" href="/portal/rejestracja/">
                Rozpocznij porównanie <Icon name="arrowRight" size={18} className="arrow" />
              </Link>
            </div>
          </div>
          <div className="card" style={{ color: "var(--graphite)" }}>
            <h3>Newsletter energetyczny dla firm</h3>
            <p className="muted small">Ceny na rynku, terminy wypowiedzeń, zmiany w taryfach i przepisach – raz w miesiącu.</p>
            <NewsletterForm source="strona-glowna" />
          </div>
        </div>
      </section>
    </>
  );
}
