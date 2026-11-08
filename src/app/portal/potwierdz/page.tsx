import type { Metadata } from "next";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { confirmEmailToken } from "@/lib/verify";
import { Icon } from "@/components/Icon";

export const metadata: Metadata = { title: "Potwierdzenie adresu e-mail", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function ConfirmEmailPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  const result = token ? await confirmEmailToken(token.slice(0, 200)) : "invalid";
  const user = await getCurrentUser();
  return (
    <div className="wizard-shell">
      <header className="wizard-shell__bar">
        <Link href="/">
          <img src="/brand/logo-online.svg" alt="energia online" width={160} height={44} style={{ width: 160, height: "auto" }} />
        </Link>
      </header>
      <main className="wizard-shell__main" style={{ maxWidth: 640 }}>
        <div className="panel" style={{ padding: 32, textAlign: "center" }}>
          {result === "ok" ? (
            <>
              <Icon name="checkCircle" size={48} className="choice__icon" />
              <h1>Adres e-mail potwierdzony</h1>
              <p className="muted">Dziękujemy! Możesz teraz wybierać oferty i podpisywać umowy w Portalu Klienta.</p>
              <Link className="btn btn--lg" href={user ? "/portal/" : "/portal/logowanie/"}>
                {user ? "Przejdź do Portalu Klienta" : "Zaloguj się"}
              </Link>
            </>
          ) : (
            <>
              <Icon name="alert" size={48} className="choice__icon" />
              <h1>Link wygasł lub został już użyty</h1>
              <p className="muted">Zaloguj się do portalu – w panelu możesz wysłać nowy link potwierdzający.</p>
              <Link className="btn btn--lg" href="/portal/">
                Przejdź do portalu
              </Link>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
