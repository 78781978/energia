import type { Metadata } from "next";
import Link from "next/link";
import { MeetUs } from "@/components/site/OrderBand";
import { featuredFaq } from "@/lib/content";
import { getCategoryCards, listPublishedPosts } from "@/lib/cms";
import { Dot, FaqList, SectionHead } from "@/components/site/blocks";
import { NewsletterForm } from "@/components/site/NewsletterForm";
import { AdvisorSpotlight } from "@/components/site/AdvisorSpotlight";
import { ProcessSteps } from "@/components/site/ProcessSteps";
import { Banner } from "@/components/site/Banner";
import { PostCard } from "@/components/site/PostCard";
import { JsonLd, faqLd } from "@/components/site/JsonLd";
import { Icon } from "@/components/Icon";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: { absolute: "Energia w Biznesie – prąd i gaz dla firm online, doradztwo energetyczne" },
  description: SITE.description,
  alternates: { canonical: "/" },
};

export default async function HomePage() {
  const faq = featuredFaq(6);
  const [cards, posts] = await Promise.all([getCategoryCards(), listPublishedPosts(3)]);
  return (
    <>
      {/* 1. Baner główny – w całości, jak w projekcie */}
      <section className="hero--banner" aria-labelledby="h1">
        <div className="container">
          <h1 id="h1" className="sr-only">
            Lepsza energia dla Twojej firmy. Porównaj oferty dostawców, wybierz najlepszą i załatw wszystko online.
          </h1>
          <Banner name="lepszaEnergia" href="/portal/wniosek/" label="Jedna rejestracja – wiele ofert od sprawdzonych dostawców. Załóż darmowe konto" priority />
          <div className="banner-actions">
            <Link className="btn btn--lg" href="/portal/wniosek/">
              Załóż darmowe konto <Icon name="arrowRight" size={18} className="arrow" />
            </Link>
            <Link className="btn btn--lg btn--secondary" href="/kontakt/?typ=analiza">
              Prześlij fakturę do analizy
            </Link>
          </div>
        </div>
      </section>

      {/* 2. Wszystkie rozwiązania */}
      <section className="section section--white" aria-labelledby="uslugi">
        <div className="container">
          <h2 id="uslugi" className="sr-only">
            Wszystkie rozwiązania energetyczne w jednym miejscu
          </h2>
          <Banner name="rozwiazania" href="#kategorie" label="Zobacz produkty – przejdź do listy usług" />
          <div id="kategorie" style={{ scrollMarginTop: 100, marginTop: 72 }}>
            <SectionHead
              eyebrow="Usługi"
              title={<Dot>Wybierz obszar dla swojej firmy</Dot>}
              lead="Od zakupu prądu i gazu, przez audyt kosztów i przyłącza, po OZE, umowy i serwis infrastruktury."
            />
          </div>
          <div className="grid grid-4" style={{ gap: 20 }}>
            {cards.map((c) => (
              <Link key={c.slug} href={`/${c.slug}/`} className="cat-card">
                <div className="cat-card__img">
                  <img src={c.image} alt="" loading="lazy" width={128} height={185} />
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
        </div>
      </section>

      {/* 3. Jak to działa – pełna grafika procesu */}
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
          <div className="banner-actions" style={{ marginTop: 40 }}>
            <Link className="btn btn--lg" href="/portal/wniosek/">
              Załóż darmowe konto <Icon name="arrowRight" size={18} className="arrow" />
            </Link>
            <Link className="btn btn--lg btn--ghost" href="/jak-to-dziala/">
              Szczegóły procesu
            </Link>
          </div>
        </div>
      </section>

      {/* 4. Portal i doradca – dwie kwadratowe grafiki */}
      <section className="section--tight" aria-label="Portal Energia Online i doradztwo Energia 360">
        <div className="container banner-pair">
          <div>
            <Banner name="kierunek" href="/portal/wniosek/" label="Wejdź na portal Energia Online" />
            <div className="banner-actions">
              <Link className="btn btn--lg" href="/portal/wniosek/">
                Wejdź na portal <Icon name="arrowRight" size={18} className="arrow" />
              </Link>
            </div>
          </div>
          <div>
            <Banner name="doradca" href="/energia-360/" label="Poznaj opiekę energetyczną Energia 360" />
            <div className="banner-actions">
              <Link className="btn btn--lg" href="/energia-360/">
                Poznaj Energia 360 <Icon name="arrowRight" size={18} className="arrow" />
              </Link>
              <Link className="btn btn--lg btn--secondary" href="/kontakt/?typ=rozmowa&temat=Energia%20360">
                Umów rozmowę
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Spółdzielnie */}
      <section className="section--tight" aria-label="Spółdzielnie energetyczne">
        <div className="container">
          <Banner name="spoldzielnie" href="/spoldzielnie-energetyczne-i-dsr/" label="Spółdzielnie energetyczne – dowiedz się więcej" />
          <div className="banner-actions">
            <Link className="btn btn--lg" href="/spoldzielnie-energetyczne-i-dsr/">
              Dowiedz się więcej <Icon name="arrowRight" size={18} className="arrow" />
            </Link>
          </div>
        </div>
      </section>

      {/* 6. Mapa usług */}
      <section className="section section--white" aria-labelledby="mapa">
        <div className="container">
          <SectionHead
            id="mapa"
            center
            eyebrow="Mapa usług"
            title={<Dot>Pełna oferta w jednym miejscu</Dot>}
            lead="10 obszarów, produkty dodatkowe i rozwiązania specjalne dla firm, instytucji i spółdzielni."
          />
          <Banner name="mapaUslug" />
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

      {/* Aktualności – widoczne, gdy w panelu są opublikowane wpisy */}
      {posts.length > 0 && (
        <section className="section" aria-labelledby="aktualnosci">
          <div className="container">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 24, flexWrap: "wrap" }}>
              <SectionHead id="aktualnosci" eyebrow="Aktualności" title={<Dot>Z rynku energii</Dot>} />
              <Link className="link-arrow" href="/aktualnosci/" style={{ marginBottom: 48 }}>
                Wszystkie wpisy <Icon name="arrowRight" size={18} />
              </Link>
            </div>
            <div className="grid grid-3">
              {posts.map((p) => (
                <PostCard key={p.id} post={p} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Poznaj nas */}
      <MeetUs />

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
              <Link className="btn btn--lg" href="/portal/wniosek/">
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
