import Link from "next/link";
import { Icon } from "@/components/Icon";

/** Blok „Zamów energię i gaz” nad stopką – na każdej stronie serwisu. */
export function OrderBand() {
  return (
    <section className="section--tight" aria-labelledby="zamow-band">
      <div className="container">
        <div className="order-band">
          <div>
            <h2 id="zamow-band">
              Zamów energię i gaz dla firmy<span className="dot">.</span>
            </h2>
            <p>Jedna rejestracja – wiele ofert od sprawdzonych dostawców. Załóż darmowe konto, porównaj propozycje i podpisz umowę online.</p>
          </div>
          <div className="btn-row">
            <Link className="btn btn--lg" href="/portal/wniosek/">
              Zarejestruj się <Icon name="arrowRight" size={18} className="arrow" />
            </Link>
            <Link className="btn btn--lg btn--light" href="/portal/logowanie/">
              Zaloguj się
            </Link>
            <Link className="btn btn--lg btn--ghost" href="/kontakt/?typ=rozmowa" style={{ color: "#fff", borderColor: "rgba(255,255,255,.4)" }}>
              <Icon name="phone" size={18} /> Kontakt z doradcą
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

/** Sekcja „Poznaj nas” na stronie głównej. */
export function MeetUs() {
  return (
    <section className="section section--white" aria-labelledby="poznaj">
      <div className="container">
        <div className="grid grid-2" style={{ alignItems: "center", gap: 48 }}>
          <div>
            <span className="eyebrow">Poznaj nas</span>
            <h2 id="poznaj">
              Energia w Biznesie i portal Energia Online<span className="dot">.</span>
            </h2>
            <p className="lead">
              Doradzamy firmom, spółdzielniom i instytucjom w zakupie energii i gazu, optymalizacji kosztów dystrybucji i inwestycjach w OZE. Portal Energia Online
              pozwala zamówić energię i zarządzać umowami w jednym miejscu.
            </p>
            <div className="btn-row">
              <Link className="btn btn--lg" href="/kontakt/?typ=rozmowa">
                Kontakt z ekspertem <Icon name="arrowRight" size={18} className="arrow" />
              </Link>
              <Link className="btn btn--lg btn--secondary" href="/kontakt/#biuro">
                <Icon name="building" size={18} /> Biuro
              </Link>
              <Link className="btn btn--lg btn--ghost" href="/kontakt/#dane">
                Dane adresowe
              </Link>
            </div>
          </div>
          <ul className="checklist">
            <li>
              <Icon name="check" /> Oferty prądu i gazu od sprawdzonych dostawców w jednym miejscu
            </li>
            <li>
              <Icon name="check" /> Pełna kontrola nad kosztami, licznikami i terminami umów
            </li>
            <li>
              <Icon name="check" /> Doradca, który zna Twoje faktury i mówi prostym językiem
            </li>
            <li>
              <Icon name="check" /> Bezpieczeństwo danych: weryfikacja e-mail i logowanie dwuetapowe
            </li>
          </ul>
        </div>
      </div>
    </section>
  );
}
