"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useActionState, useId, useState } from "react";
import { submitLead } from "@/app/actions/public";
import { initialFormState } from "@/lib/forms";
import { FieldError, FormAlert, Honeypot, SubmitButton, invalid } from "@/components/forms";
import { Icon } from "@/components/Icon";

type Props = {
  defaultType?: "KONTAKT" | "ROZMOWA" | "ANALIZA";
  topic?: string;
  compact?: boolean;
  showTypes?: boolean;
};

export function LeadForm({ defaultType = "KONTAKT", topic = "", compact = false, showTypes = true }: Props) {
  const [state, action] = useActionState(submitLead, initialFormState);
  const [type, setType] = useState(state.values?.type || defaultType);
  const [fileName, setFileName] = useState<string | null>(null);
  const pathname = usePathname();
  const id = useId();
  const v = state.values ?? {};

  if (state.ok)
    return (
      <div className="stack" style={{ textAlign: "center", justifyItems: "center" }}>
        <img src="/img/3d/potwierdzenie.png" alt="" width={200} height={150} style={{ width: 200 }} />
        <h3>Zapytanie wysłane</h3>
        <p className="muted">{state.message}</p>
      </div>
    );

  return (
    <form action={action} className="form" noValidate>
      <Honeypot />
      <input type="hidden" name="pagePath" value={pathname} />
      <input type="hidden" name="topic" value={topic} />
      {showTypes ? (
        <fieldset className="fieldset">
          <legend>W czym możemy pomóc?</legend>
          <div className="choice-grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))" }}>
            {(
              [
                ["ROZMOWA", "Rozmowa z doradcą", "phone"],
                ["ANALIZA", "Analiza faktury", "file"],
                ["KONTAKT", "Inne pytanie", "message"],
              ] as const
            ).map(([val, label, icon]) => (
              <label className="choice" key={val}>
                <input type="radio" name="type" value={val} checked={type === val} onChange={() => setType(val)} />
                <span>
                  <Icon name={icon} className="choice__icon" />
                  {label}
                </span>
              </label>
            ))}
          </div>
        </fieldset>
      ) : (
        <input type="hidden" name="type" value={type} />
      )}

      {topic && (
        <div className="alert">
          <Icon name="info" />
          <p>
            Temat: <strong style={{ display: "inline" }}>{topic}</strong>
          </p>
        </div>
      )}

      <div className={compact ? "form" : "form-row"} style={compact ? { gap: 16 } : undefined}>
        <div className="field">
          <label htmlFor={`${id}-name`}>Imię i nazwisko</label>
          <input id={`${id}-name`} className="input" name="name" autoComplete="name" defaultValue={v.name} required {...invalid(state, "name")} />
          <FieldError state={state} name="name" />
        </div>
        <div className="field">
          <label htmlFor={`${id}-company`}>
            Firma <span className="opt">(opcjonalnie)</span>
          </label>
          <input id={`${id}-company`} className="input" name="company" autoComplete="organization" defaultValue={v.company} />
        </div>
      </div>
      <div className={compact ? "form" : "form-row"} style={compact ? { gap: 16 } : undefined}>
        <div className="field">
          <label htmlFor={`${id}-email`}>Adres e-mail</label>
          <input id={`${id}-email`} className="input" type="email" name="email" autoComplete="email" placeholder="firma@przyklad.pl" defaultValue={v.email} required {...invalid(state, "email")} />
          <FieldError state={state} name="email" />
        </div>
        <div className="field">
          <label htmlFor={`${id}-phone`}>
            Telefon {type !== "ROZMOWA" && <span className="opt">(opcjonalnie)</span>}
          </label>
          <input id={`${id}-phone`} className="input" type="tel" name="phone" autoComplete="tel" placeholder="+48" defaultValue={v.phone} {...invalid(state, "phone")} />
          <FieldError state={state} name="phone" />
        </div>
      </div>
      {!compact && (
        <div className="field">
          <label htmlFor={`${id}-nip`}>
            NIP firmy <span className="opt">(opcjonalnie)</span>
          </label>
          <input id={`${id}-nip`} className="input" name="nip" inputMode="numeric" placeholder="Wpisz 10 cyfr" defaultValue={v.nip} {...invalid(state, "nip")} />
          <FieldError state={state} name="nip" />
        </div>
      )}

      {type === "ANALIZA" && (
        <div className="field">
          <span className="label">Faktura za energię</span>
          <label className="dropzone">
            <input type="file" name="file" accept="application/pdf,image/jpeg,image/png" onChange={(e) => setFileName(e.target.files?.[0]?.name ?? null)} />
            <Icon name="upload" size={28} />
            <strong>{fileName ?? "Wybierz plik lub upuść go tutaj"}</strong>
            <span className="hint">PDF, JPG lub PNG, do 10 MB</span>
          </label>
          <FieldError state={state} name="file" />
        </div>
      )}

      <div className="field">
        <label htmlFor={`${id}-message`}>
          Wiadomość <span className="opt">{type === "ANALIZA" ? "(opcjonalnie)" : ""}</span>
        </label>
        <textarea
          id={`${id}-message`}
          className="textarea"
          name="message"
          rows={compact ? 3 : 5}
          defaultValue={v.message}
          placeholder={type === "ROZMOWA" ? "Kiedy najlepiej zadzwonić? Czego dotyczy rozmowa?" : "Opisz krótko swoją sytuację"}
        />
      </div>

      <label className="check">
        <input type="checkbox" name="consent" required {...invalid(state, "consent")} />
        <span>
          Wyrażam zgodę na kontakt w sprawie zapytania. Administratorem danych jest {""}
          Energia w Biznesie – szczegóły w <Link href="/polityka-prywatnosci/">polityce prywatności</Link>.
        </span>
      </label>
      <FieldError state={state} name="consent" />
      <label className="check">
        <input type="checkbox" name="marketing" />
        <span>Chcę otrzymywać informacje o ofertach i zmianach na rynku energii (opcjonalnie).</span>
      </label>

      <FormAlert state={state} />
      <div>
        <SubmitButton className="btn btn--lg">{type === "ROZMOWA" ? "Zamów rozmowę" : type === "ANALIZA" ? "Wyślij do analizy" : "Wyślij wiadomość"}</SubmitButton>
      </div>
    </form>
  );
}
