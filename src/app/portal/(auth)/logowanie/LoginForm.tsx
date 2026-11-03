"use client";

import Link from "next/link";
import { useActionState } from "react";
import { login } from "@/app/actions/auth";
import { initialFormState } from "@/lib/forms";
import { FormAlert, SubmitButton } from "@/components/forms";
import { Icon } from "@/components/Icon";

export function LoginForm({ next, loggedOut }: { next: string; loggedOut: boolean }) {
  const [state, action] = useActionState(login, initialFormState);
  return (
    <form action={action} className="form" noValidate>
      <input type="hidden" name="next" value={next} />
      {loggedOut && !state.error && (
        <div className="alert alert--ok" role="status">
          <Icon name="checkCircle" />
          <p>Wylogowano. Do zobaczenia!</p>
        </div>
      )}
      <div className="field">
        <label htmlFor="email">Adres e-mail</label>
        <input id="email" className="input" type="email" name="email" autoComplete="email" placeholder="firma@przyklad.pl" defaultValue={state.values?.email} required autoFocus />
      </div>
      <div className="field">
        <label htmlFor="password">Hasło</label>
        <input id="password" className="input" type="password" name="password" autoComplete="current-password" required />
        <div style={{ textAlign: "right" }}>
          <Link href="/portal/reset-hasla/" className="small">
            Nie pamiętasz hasła?
          </Link>
        </div>
      </div>
      <label className="check">
        <input type="checkbox" name="remember" defaultChecked />
        <span>Zapamiętaj mnie na tym urządzeniu (14 dni)</span>
      </label>
      <FormAlert state={state} />
      <SubmitButton className="btn btn--lg btn--block" pending="Logowanie…" arrow={false}>
        Zaloguj się
      </SubmitButton>
      <p className="small" style={{ margin: 0 }}>
        Nie masz konta? <Link href="/portal/wniosek/">Załóż darmowe konto i otrzymaj oferty</Link>
      </p>
    </form>
  );
}
