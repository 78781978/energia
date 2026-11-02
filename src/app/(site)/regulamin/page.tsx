import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/site/blocks";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: "Regulamin portalu Energia Online",
  robots: { index: false },
  alternates: { canonical: "/regulamin/" },
};

const T = ({ children }: { children: React.ReactNode }) => <span className="todo">{children}</span>;

/** SZABLON – wymaga przygotowania przez prawnika (zob. BRAKI.md). */
export default function TermsPage() {
  return (
    <section className="page-hero">
      <div className="container prose legal" style={{ maxWidth: 820 }}>
        <Breadcrumbs items={[{ name: "Regulamin portalu", path: "/regulamin/" }]} />
        <h1>Regulamin portalu Energia Online</h1>
        <div className="alert alert--warn" style={{ marginBottom: 32 }}>
          <p>Wersja robocza – struktura dokumentu do uzupełnienia i weryfikacji prawnej przed uruchomieniem portalu.</p>
        </div>
        <h2>§1. Postanowienia ogólne</h2>
        <p>
          Portal prowadzi {SITE.legalName ?? <T>[nazwa podmiotu]</T>}. Regulamin określa zasady zakładania konta, składania wniosków o ofertę
          oraz obsługi dokumentów.
        </p>
        <h2>§2. Konto użytkownika</h2>
        <p>
          <T>[warunki rejestracji, kto może założyć konto, bezpłatność, usunięcie konta]</T>
        </p>
        <h2>§3. Wniosek o ofertę i rola portalu</h2>
        <p>
          <T>[czy portal jest pośrednikiem/agentem sprzedawcy; na jakim etapie zawierana jest umowa sprzedaży; wynagrodzenie]</T>
        </p>
        <h2>§4. Podpisywanie dokumentów</h2>
        <p>
          <T>[dopuszczalne formy podpisu: kwalifikowany, zaufany, odręczny skan; moment zawarcia umowy]</T>
        </p>
        <h2>§5. Reklamacje</h2>
        <p>
          <T>[tryb i terminy reklamacji]</T>
        </p>
        <h2>§6. Dane osobowe</h2>
        <p>Zasady przetwarzania danych opisuje polityka prywatności.</p>
      </div>
    </section>
  );
}
