/** Proces zakupu energii w portalu – 7 kroków z ilustracjami (pokazywanymi w całości). */
export const PROCESS_STEPS = [
  { title: "Wybierz media", text: "Prąd, gaz albo prąd i gaz – dla których chcesz otrzymać ofertę.", img: "/img/kroki/krok-1.jpg" },
  { title: "Wybierz lata zakupu", text: "Zabezpiecz zakup energii na jeden rok lub kilka kolejnych lat.", img: "/img/kroki/krok-2.jpg" },
  { title: "Wybierz model ceny", text: "Stała cena, ceny giełdowe RDN, zakup w transzach, energia z OZE lub wycena indywidualna.", img: "/img/kroki/krok-3.jpg" },
  { title: "Podaj taryfę i zużycie", text: "Grupa taryfowa i szacowane roczne zużycie energii – wystarczy orientacyjnie.", img: "/img/kroki/krok-4.jpg" },
  { title: "Wczytaj fakturę (PDF)", text: "Nie znasz danych? Prześlij fakturę za prąd lub gaz, a resztę uzupełnimy.", img: "/img/kroki/krok-5.jpg" },
  { title: "Weryfikacja danych", text: "Doradca sprawdza dane z faktury i przygotowuje oferty dopasowane do firmy.", img: "/img/kroki/krok-6.jpg" },
  { title: "Wyślij zamówienie", text: "Wybierz ofertę i zamów umowę online albo zamów rozmowę z doradcą.", img: "/img/kroki/krok-7.jpg" },
];

export function ProcessSteps() {
  return (
    <ol className="steps" style={{ listStyle: "none", padding: 0, margin: 0 }}>
      {PROCESS_STEPS.map((s, i) => (
        <li className="step" key={s.title}>
          <div className="step__img">
            <img src={s.img} alt={`Krok ${i + 1}: ${s.title}`} loading="lazy" width={1312} height={1199} />
          </div>
          <div className="step__body">
            <span className="step__num" aria-hidden="true">
              {i + 1}
            </span>
            <div>
              <h3>{s.title}</h3>
              <p>{s.text}</p>
            </div>
          </div>
        </li>
      ))}
    </ol>
  );
}
