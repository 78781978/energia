"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Icon, type IconName } from "@/components/Icon";

type NavCat = { slug: string; name: string; icon: IconName; services: { slug: string; name: string }[] };

export function SiteHeader({ categories }: { categories: NavCat[] }) {
  const [me, setMe] = useState<{ role: string } | null>(null);
  useEffect(() => {
    fetch("/api/sesja/", { credentials: "same-origin" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setMe(d?.user ?? null))
      .catch(() => undefined);
  }, []);
  const loggedIn = !!me;
  const isAdmin = me?.role === "ADMIN";
  const [megaOpen, setMegaOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();
  const navRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMegaOpen(false);
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!megaOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMegaOpen(false);
    const onClick = (e: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(e.target as Node)) setMegaOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onClick);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onClick);
    };
  }, [megaOpen]);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
  }, [mobileOpen]);

  const portalHref = loggedIn ? (isAdmin ? "/admin/" : "/portal/") : "/portal/logowanie/";
  const portalLabel = loggedIn ? (isAdmin ? "Panel administratora" : "Mój panel") : "Zaloguj się";
  const cur = (href: string) => (pathname === href ? "page" : undefined);

  return (
    <header className="site-header" data-scrolled={scrolled} ref={navRef}>
      <div className="container site-header__inner">
        <Link href="/" className="site-logo" aria-label="Energia w Biznesie – strona główna">
          <img src="/brand/logo-biznes.png" alt="energia w biznesie" width={180} height={50} />
        </Link>

        <nav className="main-nav" aria-label="Główna nawigacja">
          <div className="nav-item">
            <button type="button" aria-expanded={megaOpen} aria-controls="mega-uslugi" onClick={() => setMegaOpen((v) => !v)}>
              Usługi <Icon name="chevronDown" size={18} />
            </button>
            {megaOpen && (
              <div className="mega" id="mega-uslugi">
                <div className="container">
                  <div className="mega__grid">
                    {categories.map((c) => (
                      <div className="mega__cat" key={c.slug}>
                        <Link href={`/${c.slug}/`}>
                          <Icon name={c.icon} size={22} />
                          {c.name}
                        </Link>
                        <ul>
                          {c.services.slice(0, 4).map((s) => (
                            <li key={s.slug}>
                              <Link href={`/${s.slug}/`}>{s.name}</Link>
                            </li>
                          ))}
                          {c.services.length > 4 && (
                            <li>
                              <Link href={`/${c.slug}/`} style={{ color: "var(--red-btn)", fontWeight: 700 }}>
                                + {c.services.length - 4} więcej
                              </Link>
                            </li>
                          )}
                        </ul>
                      </div>
                    ))}
                  </div>
                  <div className="mega__foot">
                    <span className="muted small">Nie wiesz, od czego zacząć? Prześlij fakturę – doradca wskaże właściwą usługę.</span>
                    <Link className="btn btn--sm" href="/kontakt/?typ=analiza">
                      Prześlij fakturę do analizy <Icon name="arrowRight" size={18} className="arrow" />
                    </Link>
                  </div>
                </div>
              </div>
            )}
          </div>
          <Link href="/jak-to-dziala/" aria-current={cur("/jak-to-dziala/")}>Jak to działa</Link>
          <Link href="/energia-360/" aria-current={cur("/energia-360/")}>Energia 360</Link>
          <Link href="/aktualnosci/" aria-current={cur("/aktualnosci/")}>Aktualności</Link>
          <Link href="/o-nas/" aria-current={cur("/o-nas/")}>O nas</Link>
          <Link href="/kontakt/" aria-current={cur("/kontakt/")}>Kontakt</Link>
        </nav>

        <div className="header-actions header-actions--desktop">
          <Link href={portalHref} className="btn btn--ghost btn--sm">
            <Icon name="user" size={18} /> {portalLabel}
          </Link>
          {!loggedIn && (
            <Link href="/portal/wniosek/" className="btn btn--sm">
              Porównaj oferty <Icon name="arrowRight" size={18} className="arrow" />
            </Link>
          )}
        </div>

        {!loggedIn && (
          <Link href="/portal/wniosek/" className="btn btn--sm header-cta-mobile">
            Porównaj oferty
          </Link>
        )}
        <button
          type="button"
          className="btn btn--ghost btn--sm nav-toggle"
          aria-expanded={mobileOpen}
          aria-controls="mobile-nav"
          onClick={() => setMobileOpen((v) => !v)}
        >
          <Icon name={mobileOpen ? "close" : "menu"} size={20} />
          <span className="sr-only">{mobileOpen ? "Zamknij menu" : "Otwórz menu"}</span>
        </button>
      </div>

      {mobileOpen && (
        <nav className="mobile-nav" id="mobile-nav" aria-label="Menu">
          {categories.map((c) => (
            <details key={c.slug}>
              <summary>
                {c.name} <Icon name="chevronDown" size={18} />
              </summary>
              <ul>
                <li>
                  <Link href={`/${c.slug}/`} style={{ color: "var(--red-btn)", fontWeight: 700 }}>
                    Przegląd kategorii
                  </Link>
                </li>
                {c.services.map((s) => (
                  <li key={s.slug}>
                    <Link href={`/${s.slug}/`}>{s.name}</Link>
                  </li>
                ))}
              </ul>
            </details>
          ))}
          <Link href="/jak-to-dziala/">Jak to działa</Link>
          <Link href="/aktualnosci/">Aktualności</Link>
          <Link href="/o-nas/">O nas</Link>
          <Link href="/kontakt/">Kontakt</Link>
          <div className="mobile-nav__actions">
            <Link href="/portal/wniosek/" className="btn btn--lg">
              Porównaj oferty <Icon name="arrowRight" size={18} className="arrow" />
            </Link>
            <Link href={portalHref} className="btn btn--ghost btn--lg">
              <Icon name="user" size={18} /> {portalLabel}
            </Link>
          </div>
        </nav>
      )}
    </header>
  );
}
