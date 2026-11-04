/**
 * Portret doradcy z odręcznymi notatkami (wg inspiracji przesłanej przez klienta).
 * Notatki stoją obok ilustracji (szeroka kolumna) albo pod nią (wąska kolumna, telefon) – nigdy na grafice.
 * Zdjęcie i fakty do uzupełnienia – zob. BRAKI.md. Plik: public/img/doradca.jpg
 */
const ADVISOR = {
  name: "Twój doradca",
  photo: null as string | null, // np. "/img/doradca.jpg"
  notes: [
    { text: <>umowy na prąd<br />i gaz – <b>bez tajemnic</b></>, rot: "-3deg" },
    { text: <>pilnuje terminów<br /><b>wypowiedzeń</b></>, rot: "2deg" },
    { text: <>czyta faktury<br />linijka po linijce</>, rot: "-2deg" },
    { text: <>stała cena <b>czy</b> SPOT?<br />sprawdzimy</>, rot: "3deg" },
  ],
};

export function AdvisorSpotlight() {
  return (
    <figure className="advisor" style={{ margin: 0 }}>
      <div className="advisor__grid">
        <span className="advisor__note advisor__note--name">{ADVISOR.name}</span>
        <div className="advisor__photo">
          {ADVISOR.photo ? (
            <img src={ADVISOR.photo} alt={`${ADVISOR.name} – doradca energetyczny`} />
          ) : (
            // Do czasu dostarczenia zdjęcia pokazujemy ilustrację z zestawu marki.
            <img src="/img/kategorie/doradztwo.jpg" alt="" width={1312} height={1199} className="advisor__art" />
          )}
        </div>
        {ADVISOR.notes.map((n, i) => (
          <span key={i} className={`advisor__note advisor__note--${i + 1}`} style={{ ["--rot" as string]: n.rot }}>
            {n.text}
          </span>
        ))}
      </div>
      <figcaption className="sr-only">Doradca energetyczny Energia w Biznesie</figcaption>
    </figure>
  );
}
