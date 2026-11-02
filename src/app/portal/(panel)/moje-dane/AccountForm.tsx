"use client";

import Link from "next/link";
import { useActionState } from "react";
import { updateMyAccount } from "@/app/actions/portal";
import { initialFormState } from "@/lib/forms";
import { FieldError, FormAlert, SubmitButton, invalid } from "@/components/forms";

export function AccountForm({ email, name, phone, marketing }: { email: string; name: string | null; phone: string | null; marketing: boolean }) {
  const [state, action] = useActionState(updateMyAccount, initialFormState);
  return (
    <section className="panel" aria-labelledby="konto">
      <div className="panel__head">
        <h2 id="konto">Konto</h2>
        <Link href="/portal/reset-hasla/" className="small">
          Zmień hasło
        </Link>
      </div>
      <form action={action} className="form" style={{ gap: 16 }}>
        <div className="form-row form-row--3">
          <div className="field">
            <label htmlFor="acc-email">E-mail logowania</label>
            <input id="acc-email" className="input" value={email} disabled />
          </div>
          <div className="field">
            <label htmlFor="acc-name">Imię i nazwisko</label>
            <input id="acc-name" className="input" name="name" defaultValue={name ?? ""} />
          </div>
          <div className="field">
            <label htmlFor="acc-phone">Telefon</label>
            <input id="acc-phone" className="input" name="phone" type="tel" defaultValue={phone ?? ""} {...invalid(state, "phone")} />
            <FieldError state={state} name="phone" />
          </div>
        </div>
        <label className="check">
          <input type="checkbox" name="marketing" defaultChecked={marketing} />
          <span>Chcę otrzymywać informacje o ofertach energii i zmianach na rynku.</span>
        </label>
        <FormAlert state={state} />
        <div>
          <SubmitButton className="btn" arrow={false} pending="Zapisuję…">
            Zapisz
          </SubmitButton>
        </div>
      </form>
    </section>
  );
}
