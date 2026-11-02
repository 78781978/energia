"use client";

import Link from "next/link";
import { useActionState } from "react";
import { requestPasswordReset } from "@/app/actions/auth";
import { initialFormState } from "@/lib/forms";
import { FormAlert, SubmitButton } from "@/components/forms";

export default function ResetRequestPage() {
  const [state, action] = useActionState(requestPasswordReset, initialFormState);
  return (
    <>
      <h1>Nie pamiętasz hasła?</h1>
      <p className="muted" style={{ marginBottom: 32 }}>
        Podaj adres e-mail konta – wyślemy link do ustawienia nowego hasła.
      </p>
      {state.ok ? (
        <FormAlert state={state} />
      ) : (
        <form action={action} className="form" noValidate>
          <div className="field">
            <label htmlFor="email">Adres e-mail</label>
            <input id="email" className="input" type="email" name="email" autoComplete="email" required defaultValue={state.values?.email} />
          </div>
          <FormAlert state={state} />
          <SubmitButton className="btn btn--lg btn--block" arrow={false}>
            Wyślij link
          </SubmitButton>
        </form>
      )}
      <p className="small" style={{ marginTop: 24 }}>
        <Link href="/portal/logowanie/">Wróć do logowania</Link>
      </p>
    </>
  );
}
