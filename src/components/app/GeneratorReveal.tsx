"use client";

import { useEffect, useState } from "react";

const STEPS = ["Analizujemy Twoje zużycie i taryfy", "Porównujemy oferty sprawdzonych dostawców", "Dopasowujemy warianty zakupu", "Przygotowujemy propozycje"];

/** Animacja generatora ofert („myślące kropki”) wyświetlana po złożeniu zamówienia. */
export function GeneratorReveal({ found }: { found: number }) {
  const [i, setI] = useState(0);
  const [done, setDone] = useState(false);
  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const t = setInterval(() => setI((x) => Math.min(x + 1, STEPS.length)), reduce ? 250 : 900);
    const end = setTimeout(() => {
      setDone(true);
      const url = new URL(window.location.href);
      url.searchParams.delete("generuj");
      window.history.replaceState(null, "", url.toString());
    }, reduce ? 1000 : 4000);
    return () => {
      clearInterval(t);
      clearTimeout(end);
    };
  }, []);
  return (
    <div className="generator" data-done={done} role="status" aria-live="polite">
      <div className="generator__box">
        <img src="/img/3d/iskra.png" alt="" width={140} height={170} />
        <h2 style={{ marginBottom: 0 }}>{i >= STEPS.length ? (found ? `Mamy ${found} ${found === 1 ? "propozycję" : "propozycje"}!` : "Zamówienie przyjęte!") : "Generujemy oferty"}</h2>
        <div className="thinking" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
        <ul className="generator__steps">
          {STEPS.map((s, k) => (
            <li key={s} data-on={k < i}>
              {k < i ? "✓ " : ""}
              {s}
            </li>
          ))}
        </ul>
        <button type="button" className="btn btn--ghost btn--sm" style={{ marginTop: 16 }} onClick={() => setDone(true)}>
          Pomiń
        </button>
      </div>
    </div>
  );
}
