import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { MEDIA, purchaseYears, type Media } from "@/lib/constants";
import { companyDraft, pointDrafts } from "@/lib/drafts";
import { TURNSTILE_SITE_KEY } from "@/lib/captcha";
import { Icon } from "@/components/Icon";
import { Wizard } from "./Wizard";

export const metadata: Metadata = {
  title: "Zamów energię i gaz dla firmy",
  description: "Jedna rejestracja – wiele ofert od sprawdzonych dostawców. Wypełnij kreator, a wygenerujemy propozycje dla Twojej firmy.",
  robots: { index: false, follow: true },
};
export const dynamic = "force-dynamic";

/** Kreator zamówienia – dostępny bez logowania (rejestracja na końcu) i dla zalogowanych klientów. */
export default async function WizardPage({ searchParams }: { searchParams: Promise<{ media?: string }> }) {
  const user = await getCurrentUser();
  if (user?.role === "ADMIN") redirect("/admin/");
  const sp = await searchParams;
  const company = user ? await db.company.findFirst({ where: { ownerId: user.id }, orderBy: { updatedAt: "desc" }, include: { points: true } }) : null;
  const now = new Date();
  const years = purchaseYears(now.getMonth() >= 9 ? new Date(now.getFullYear() + 1, 0, 1) : now);
  const initialMedia = sp.media && sp.media in MEDIA ? (sp.media as Media) : "";
  return (
    <div className="wizard-shell">
      <header className="wizard-shell__bar">
        <Link href={user ? "/portal/" : "/"} aria-label={user ? "Portal Klienta" : "Strona główna"}>
          <img src="/brand/logo-online.svg" alt="energia online" width={160} height={44} style={{ width: 160, height: "auto" }} />
        </Link>
        <div className="wizard-shell__actions">
          {user ? (
            <Link href="/portal/" className="btn btn--ghost btn--sm">
              <Icon name="arrowLeft" size={16} /> Wróć do Portalu Klienta
            </Link>
          ) : (
            <>
              <span className="small muted only-desktop">Masz już konto?</span>
              <Link href="/portal/logowanie/?next=/portal/wniosek/" className="btn btn--ghost btn--sm">
                <Icon name="user" size={16} /> Zaloguj się
              </Link>
            </>
          )}
        </div>
      </header>
      <main className="wizard-shell__main">
        <div className="wizard-shell__intro">
          <p className="eyebrow">Zamów energię i gaz</p>
          <h1>{user ? "Nowe zamówienie" : "Załóż darmowe konto i otrzymaj oferty"}</h1>
          <p className="muted">Jedna rejestracja – wiele ofert od sprawdzonych dostawców. Kreator zajmie kilka minut, a brakujące dane uzupełni z Tobą doradca.</p>
        </div>
        <Wizard
          company={companyDraft(company, user ?? { email: "", name: null, phone: null })}
          points={pointDrafts(company?.points ?? [])}
          years={years}
          loggedIn={Boolean(user)}
          turnstileSiteKey={TURNSTILE_SITE_KEY}
          initialMedia={initialMedia}
        />
      </main>
      <footer className="wizard-shell__foot small muted">
        <Link href="/regulamin/">Regulamin</Link> · <Link href="/polityka-prywatnosci/">Polityka prywatności</Link> · <Link href="/kontakt/?typ=rozmowa">Kontakt z ekspertem</Link>
      </footer>
    </div>
  );
}
