/**
 * Portret doradcy z odręcznymi notatkami (wg inspiracji przesłanej przez klienta).
 * Zdjęcie i fakty do uzupełnienia – zob. BRAKI.md. Plik: public/img/doradca.jpg
 */
const ADVISOR = {
  name: "Twój doradca",
  photo: null as string | null, // np. "/img/doradca.jpg"
  notes: [
    { text: <>umowy na prąd<br />i gaz – <b>bez tajemnic</b></>, style: { left: "6%", top: "12%", "--rot": "-4deg" } },
    { text: <>pilnuje terminów<br /><b>wypowiedzeń</b></>, style: { right: "6%", top: "22%", "--rot": "3deg" } },
    { text: <>czyta faktury<br />linijka po linijce</>, style: { left: "5%", bottom: "26%", "--rot": "-2deg" } },
    { text: <>stała cena <b>czy</b> SPOT?<br />sprawdzimy</>, style: { right: "5%", bottom: "14%", "--rot": "4deg" } },
  ],
};

export function AdvisorSpotlight() {
  return (
    <figure className="advisor" style={{ margin: 0 }}>
      <span className="advisor__note advisor__note--name" style={{ right: "8%", top: "4%", ["--rot" as string]: "-2deg" }}>
        {ADVISOR.name}
      </span>
      {ADVISOR.notes.map((n, i) => (
        <span key={i} className="advisor__note" style={n.style as React.CSSProperties}>
          {n.text}
        </span>
      ))}
      <div className="advisor__photo">
        {ADVISOR.photo ? (
          <img src={ADVISOR.photo} alt={`${ADVISOR.name} – doradca energetyczny`} />
        ) : (
          // Do czasu dostarczenia zdjęcia pokazujemy ilustrację z zestawu marki.
          <div className="advisor__placeholder" style={{ borderStyle: "solid", borderColor: "transparent", background: "#fff" }}>
            <img src="/img/kategorie/doradztwo.jpg" alt="" width={190} height={175} style={{ width: "85%", borderRadius: 16 }} />
          </div>
        )}
      </div>
      <figcaption className="sr-only">Doradca energetyczny Energia w Biznesie</figcaption>
    </figure>
  );
}
