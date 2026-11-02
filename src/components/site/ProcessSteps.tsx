import { PROCESS_STEPS } from "@/lib/process";

export function ProcessSteps() {
  return (
    <ol className="steps" style={{ listStyle: "none", padding: 0, margin: 0 }}>
      {PROCESS_STEPS.map((s, i) => (
        <li className="step" key={s.title}>
          <div className="step__img">
            <img src={s.img} alt="" loading="lazy" width={312} height={330} />
          </div>
          <div className="step__body">
            <span className="step__num" aria-hidden="true">
              {i + 1}
            </span>
            <div>
              <h3>
                <span className="sr-only">Krok {i + 1}: </span>
                {s.title}
              </h3>
              <p>{s.text}</p>
            </div>
          </div>
        </li>
      ))}
    </ol>
  );
}
