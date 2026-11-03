import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/site/blocks";
import { SITE } from "@/lib/site";
import { getSiteSettings } from "@/lib/cms";

export const metadata: Metadata = {
  title: "Polityka prywatności",
  robots: { index: false },
  alternates: { canonical: "/polityka-prywatnosci/" },
};

const T = ({ children }: { children: React.ReactNode }) => <span className="todo">{children}</span>;

/**
 * SZABLON – wymaga weryfikacji i uzupełnienia przez prawnika/IOD (zob. BRAKI.md).
 */
export default async function PrivacyPage() {
  const st = await getSiteSettings();
  return (
    <section className="page-hero">
      <div className="container prose legal" style={{ maxWidth: 820 }}>
        <Breadcrumbs items={[{ name: "Polityka prywatności", path: "/polityka-prywatnosci/" }]} />
        <h1>Polityka prywatności</h1>
        <div className="alert alert--warn" style={{ marginBottom: 32 }}>
          <p>Wersja robocza dokumentu – przed publikacją wymaga uzupełnienia danych administratora i weryfikacji prawnej.</p>
        </div>
        <h2>1. Administrator danych</h2>
        <p>
          Administratorem danych osobowych jest {st.legalName ?? <T>[pełna nazwa podmiotu]</T>}, {st.address ?? <T>[adres siedziby]</T>}, NIP{" "}
          {st.nip ?? <T>[NIP]</T>}. Kontakt w sprawach danych osobowych: {st.email ?? <T>[adres e-mail]</T>}.
        </p>
        <h2>2. Cele i podstawy przetwarzania</h2>
        <ul>
          <li>obsługa zapytań z formularzy kontaktowych – art. 6 ust. 1 lit. b i f RODO,</li>
          <li>założenie i prowadzenie konta w portalu, przygotowanie ofert i umów – art. 6 ust. 1 lit. b RODO,</li>
          <li>wysyłka newslettera i informacji handlowych – na podstawie zgody (art. 6 ust. 1 lit. a RODO),</li>
          <li>obowiązki rozliczeniowe i podatkowe – art. 6 ust. 1 lit. c RODO,</li>
          <li>ustalenie, dochodzenie i obrona roszczeń oraz statystyka – art. 6 ust. 1 lit. f RODO.</li>
        </ul>
        <h2>3. Odbiorcy danych</h2>
        <p>
          Dane mogą być przekazywane sprzedawcom energii i gazu oraz operatorom systemów dystrybucyjnych – w zakresie niezbędnym do przygotowania
          oferty i realizacji umowy – a także dostawcom usług IT, hostingu i poczty. <T>[lista kategorii odbiorców do potwierdzenia]</T>
        </p>
        <h2>4. Okres przechowywania</h2>
        <p>
          <T>[okresy przechowywania dla poszczególnych celów]</T>
        </p>
        <h2>5. Prawa osób, których dane dotyczą</h2>
        <p>
          Przysługuje Ci prawo dostępu do danych, ich sprostowania, usunięcia, ograniczenia przetwarzania, przenoszenia, sprzeciwu oraz cofnięcia
          zgody w dowolnym momencie. Możesz też złożyć skargę do Prezesa UODO.
        </p>
        <h2>6. Pliki cookies</h2>
        <p>
          Serwis używa niezbędnych plików cookies (sesja logowania, zapamiętanie wyboru dotyczącego cookies). Za Twoją zgodą zapisujemy także
          ciasteczko <code>eo_src</code> ze źródłem wejścia (np. kampania reklamowa), aby mierzyć skuteczność komunikacji. Zgodę możesz wycofać,
          czyszcząc dane witryny w przeglądarce.
        </p>
      </div>
    </section>
  );
}
