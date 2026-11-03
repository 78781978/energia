/** Przycisk z potwierdzeniem (bez JavaScriptu) – dla operacji, których nie da się cofnąć. */
export function ConfirmAction({
  action,
  fields,
  label,
  confirm,
  question,
}: {
  action: (fd: FormData) => Promise<void>;
  fields: Record<string, string>;
  label: React.ReactNode;
  confirm: string;
  question: string;
}) {
  return (
    <details className="confirm">
      <summary className="btn btn--ghost">{label}</summary>
      <div className="confirm__box">
        <p className="small" style={{ margin: "0 0 10px" }}>
          {question}
        </p>
        <form action={action}>
          {Object.entries(fields).map(([k, v]) => (
            <input key={k} type="hidden" name={k} value={v} />
          ))}
          <button className="btn btn--sm" type="submit">
            {confirm}
          </button>
        </form>
      </div>
    </details>
  );
}
