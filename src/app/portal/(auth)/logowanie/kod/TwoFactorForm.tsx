"use client";

import Link from "next/link";
import { useActionState } from "react";
import { verifyTwoFactor } from "@/app/actions/auth";
import { initialFormState } from "@/lib/forms";
import { FormAlert, SubmitButton } from "@/components/forms";

export function TwoFactorForm() {
  const [state, action] = useActionState(verifyTwoFactor, initialFormState);
  return (
    <form action={action} className="form" noValidate>
      <div className="field">
        <label htmlFor="code">Kod</label>
        <input id="code" className="input" name="code" inputMode="numeric" autoComplete="one-time-code" placeholder="000000" maxLength={11} required autoFocus style={{ fontSize: 22, letterSpacing: 4 }} />
      </div>
      <FormAlert state={state} />
      <SubmitButton className="btn btn--lg btn--block" pending="Sprawdzanie…" arrow={false}>
        Potwierdź i zaloguj
      </SubmitButton>
      <p className="small" style={{ margin: 0 }}>
        <Link href="/portal/logowanie/">Wróć do logowania</Link>
      </p>
    </form>
  );
}
