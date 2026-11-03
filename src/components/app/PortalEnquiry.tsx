"use client";

import { useActionState, useState } from "react";
import { portalEnquiry } from "@/app/actions/account";
import { initialFormState } from "@/lib/forms";
import { FieldError, FormAlert, SubmitButton, invalid } from "@/components/forms";

const TYPES = [
  { key: "PRODUKT_TECHNICZNY", label: "Produkt techniczny", hint: "np. kompensacja mocy biernej, magazyn energii, fotowoltaika, serwis" },
  { key: "POMOC_PRAWNA", label: "Pomoc prawna", hint: "np. wypowiedzenie umowy, kary od sprzedawcy, reklamacja rozliczenia" },
  { key: "ROZMOWA", label: "Kontakt z ekspertem", hint: "pytanie o ofertę, rynek energii lub zamówienie" },
];

export function PortalEnquiry({ initialType }: { initialType: string }) {
  const [state, action] = useActionState(portalEnquiry, initialFormState);
  const [type, setType] = useState(TYPES.some((t) => t.key === initialType) ? initialType : "ROZMOWA");
  const current = TYPES.find((t) => t.key === type)!;
  return (
    <form action={action} className="form" style={{ gap: 12 }}>
      <div className="choice-grid">
        {TYPES.map((t) => (
          <label className="choice" key={t.key}>
            <input type="radio" name="type" value={t.key} checked={type === t.key} onChange={() => setType(t.key)} />
            <span style={{ minHeight: 48 }}>{t.label}</span>
          </label>
        ))}
      </div>
      <div className="field">
        <label htmlFor="enq-topic">
          Temat <span className="opt">(opcjonalnie)</span>
        </label>
        <input id="enq-topic" className="input" name="topic" placeholder={current.hint} />
      </div>
      <div className="field">
        <label htmlFor="enq-msg">Wiadomość</label>
        <textarea id="enq-msg" className="textarea" name="message" rows={3} {...invalid(state, "message")} />
        <FieldError state={state} name="message" />
      </div>
      <FormAlert state={state} />
      <div>
        <SubmitButton className="btn" pending="Wysyłanie…">
          Wyślij zapytanie
        </SubmitButton>
      </div>
    </form>
  );
}
