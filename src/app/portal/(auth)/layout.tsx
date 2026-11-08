import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = { robots: { index: false, follow: false } };

/** Ekran logowania wg wzoru z księgi znaku: grafitowy panel z Iskrą + biała karta formularza. */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="auth-shell">
      <aside className="auth-aside">
        <Link href="/" aria-label="Strona główna">
          <img src="/brand/logo-online-white.svg" alt="energia online" width={200} height={55} style={{ width: 200 }} />
        </Link>
        <div>
          <h2>
            Twój zakup energii.
            <br />W jednym miejscu<span className="dot">.</span>
          </h2>
          <ul className="checklist" style={{ marginTop: 32, color: "#d5d7da" }}>
            <li>Oferty prądu i gazu od różnych sprzedawców</li>
            <li>Dokumenty, umowy i statusy w jednym panelu</li>
            <li>Wsparcie doradcy, kiedy go potrzebujesz</li>
          </ul>
          <img className="iskra" src="/img/3d/iskra.png" alt="" width={180} height={218} />
        </div>
        <p className="small" style={{ color: "#a5a9ad", margin: 0 }}>
          Portal Energia Online · <Link href="/polityka-prywatnosci/" style={{ color: "#d5d7da" }}>Polityka prywatności</Link>
        </p>
      </aside>
      <main className="auth-main">
        <div className="auth-card">
          <Link href="/" className="only-mobile" style={{ marginBottom: 32 }}>
            <img src="/brand/logo-online.svg" alt="energia online" width={160} height={44} style={{ width: 160 }} />
          </Link>
          {children}
        </div>
      </main>
    </div>
  );
}
