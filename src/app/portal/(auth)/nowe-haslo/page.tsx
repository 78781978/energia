"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useActionState } from "react";
import { resetPassword } from "@/app/actions/auth";
import { initialFormState } from "@/lib/forms";
import { FieldError, FormAlert, SubmitButton, invalid } from "@/components/forms";
import { PASSWORD_MIN } from "@/lib/validators";

function Form() {
  const token = useSearchParams().get("token") ?? "";
  const [state, action] = useActionState(resetPassword, initialFormState);
  if (state.ok)
    return (
      <>
        <FormAlert state={state} />
        <Link className="btn btn--lg btn--block" href="/portal/logowanie/" style={{ marginTop: 24 }}>
          Przejdź do logowania
        </Link>
      </>
    );
  return (
    <form action={action} className="form" noValidate>
      <input type="hidden" name="token" value={token} />
      <div className="field">
        <label htmlFor="password">Nowe hasło</label>
        <input id="password" className="input" type="password" name="password" autoComplete="new-password" required minLength={PASSWORD_MIN} {...invalid(state, "password")} />
        <span className="hint">Min. {PASSWORD_MIN} znaków, litery i cyfry.</span>
        <FieldError state={state} name="password" />
      </div>
      <div className="field">
        <label htmlFor="password2">Powtórz hasło</label>
        <input id="password2" className="input" type="password" name="password2" autoComplete="new-password" required {...invalid(state, "password2")} />
        <FieldError state={state} name="password2" />
      </div>
      <FormAlert state={state} />
      <SubmitButton className="btn btn--lg btn--block" arrow={false}>
        Ustaw hasło
      </SubmitButton>
    </form>
  );
}

export default function NewPasswordPage() {
  return (
    <>
      <h1>Ustaw nowe hasło</h1>
      <p className="muted" style={{ marginBottom: 32 }}>
        Po zmianie hasła wylogujemy Cię ze wszystkich urządzeń.
      </p>
      <Suspense>
        <Form />
      </Suspense>
    </>
  );
}
