import Link from "next/link";
import { CATEGORIES } from "@/lib/content";
import { SITE } from "@/lib/site";
import { getSiteSettings } from "@/lib/cms";
import { NewsletterForm } from "./NewsletterForm";

export async function SiteFooter() {
  const st = await getSiteSettings();
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
              <li><Link href="/aktualnosci/">Aktualności</Link></li>
              <li><Link href="/o-nas/">O nas</Link></li>
              <li><Link href="/kontakt/">Kontakt</Link></li>
              <li><Link href="/portal/logowanie/">Logowanie do portalu</Link></li>
              <li><Link href="/portal/wniosek/">Załóż konto</Link></li>
            </ul>
            {(st.linkedin || st.facebook) && (
              <ul style={{ marginTop: 20 }}>
                {st.linkedin && <li><a href={st.linkedin} target="_blank" rel="noopener noreferrer">LinkedIn</a></li>}
                {st.facebook && <li><a href={st.facebook} target="_blank" rel="noopener noreferrer">Facebook</a></li>}
              </ul>
            )}
            {(st.phone || st.email || st.address) && (
              <ul style={{ marginTop: 20 }}>
                {st.phone && <li><a href={`tel:${st.phone.replace(/\s/g, "")}`}>{st.phone}</a></li>}
                {st.email && <li><a href={`mailto:${st.email}`}>{st.email}</a></li>}
                {st.address && <li>{st.address}</li>}
              </ul>
            )}
          </div>
        </div>
        <div className="footer-bottom">
          <span>
            © {year} {st.legalName ?? SITE.brand}
            {st.nip ? ` · NIP ${st.nip}` : ""}
            {st.krs ? ` · KRS ${st.krs}` : ""}
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
