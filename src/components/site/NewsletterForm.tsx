"use client";

import Link from "next/link";
import { useActionState, useId } from "react";
import { subscribeNewsletter } from "@/app/actions/public";
import { initialFormState } from "@/lib/forms";
import { FormAlert, Honeypot, SubmitButton } from "@/components/forms";

export function NewsletterForm({ source, dark = false }: { source: string; dark?: boolean }) {
  const [state, action] = useActionState(subscribeNewsletter, initialFormState);
  const id = useId();
  if (state.ok) return <FormAlert state={state} />;
  return (
    <form action={action} className="form" style={{ gap: 12 }} noValidate>
      <input type="hidden" name="source" value={source} />
      <Honeypot />
      <div className="newsletter-form">
        <label htmlFor={`${id}-email`} className="sr-only">
          Adres e-mail
        </label>
        <input
          id={`${id}-email`}
          className="input"
          type="email"
          name="email"
          required
          autoComplete="email"
          placeholder="firma@przyklad.pl"
          defaultValue={state.values?.email}
        />
        <SubmitButton className={dark ? "btn btn--light" : "btn"} arrow={false} pending="Zapisuję…">
          Zapisz się
        </SubmitButton>
      </div>
      <label className="check" style={dark ? { color: "#c9cbce" } : undefined}>
        <input type="checkbox" name="consent" required />
        <span>
          Chcę otrzymywać newsletter z informacjami handlowymi. Zasady przetwarzania danych:{" "}
          <Link href="/polityka-prywatnosci/" style={dark ? { color: "#fff" } : undefined}>
            polityka prywatności
          </Link>
          .
        </span>
      </label>
      {state.error && <FormAlert state={state} />}
    </form>
  );
}
