import Link from "next/link";
import { CATEGORIES } from "@/lib/content";
import { SITE } from "@/lib/site";
import { NewsletterForm } from "./NewsletterForm";

export function SiteFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className="site-footer">
      <div className="container">
        <div className="footer-grid">
          <div>
            <div className="footer-brands">
              <img src="/brand/logo-biznes-white.png" alt="energia w biznesie" width={150} height={42} />
              <img src="/brand/logo-online-white.png" alt="energia online" width={150} height={42} />
            </div>
            <p style={{ maxWidth: 380 }}>
              Doradztwo energetyczne dla przedsiębiorców i portal do zakupu energii online. Jasno, sprawnie i wiarygodnie.
            </p>
            <h3 style={{ marginTop: 24 }}>Newsletter dla firm</h3>
            <p className="small" style={{ color: "#a5a9ad" }}>
              Zmiany na rynku energii i terminy, o których warto pamiętać. Bez spamu.
            </p>
            <NewsletterForm source="stopka" dark />
          </div>
          <div>
            <h3>Usługi</h3>
            <ul>
              {CATEGORIES.slice(0, 5).map((c) => (
                <li key={c.slug}>
                  <Link href={`/${c.slug}/`}>{c.name}</Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3>&nbsp;</h3>
            <ul>
              {CATEGORIES.slice(5).map((c) => (
                <li key={c.slug}>
                  <Link href={`/${c.slug}/`}>{c.name}</Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3>Firma</h3>
            <ul>
              <li><Link href="/jak-to-dziala/">Jak to działa</Link></li>
              <li><Link href="/o-nas/">O nas</Link></li>
              <li><Link href="/kontakt/">Kontakt</Link></li>
              <li><Link href="/portal/logowanie/">Logowanie do portalu</Link></li>
              <li><Link href="/portal/rejestracja/">Załóż konto</Link></li>
            </ul>
            {(SITE.phone || SITE.email || SITE.address) && (
              <ul style={{ marginTop: 20 }}>
                {SITE.phone && <li><a href={`tel:${SITE.phone.replace(/\s/g, "")}`}>{SITE.phone}</a></li>}
                {SITE.email && <li><a href={`mailto:${SITE.email}`}>{SITE.email}</a></li>}
                {SITE.address && <li>{SITE.address}</li>}
              </ul>
            )}
          </div>
        </div>
        <div className="footer-bottom">
          <span>
            © {year} {SITE.legalName ?? SITE.brand}
            {SITE.nip ? ` · NIP ${SITE.nip}` : ""}
            {SITE.krs ? ` · KRS ${SITE.krs}` : ""}
          </span>
          <span style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
            <Link href="/polityka-prywatnosci/">Polityka prywatności</Link>
            <Link href="/regulamin/">Regulamin portalu</Link>
          </span>
        </div>
      </div>
    </footer>
  );
}
