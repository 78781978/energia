"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useActionState, useId } from "react";
import { requestCallback } from "@/app/actions/public";
import { initialFormState } from "@/lib/forms";
import { FormAlert, Honeypot, SubmitButton, invalid } from "@/components/forms";
import { Icon } from "@/components/Icon";

/** „Zamów telefon – oddzwonimy w 60 sekund”: tylko numer telefonu i jedna zgoda. */
export function CallbackForm({ topic = "", dark = false }: { topic?: string; dark?: boolean }) {
  const [state, action] = useActionState(requestCallback, initialFormState);
  const pathname = usePathname();
  const id = useId();
  const v = state.values ?? {};

  return (
    <div className={`callback${dark ? " callback--dark" : ""}`}>
      <div className="callback__head">
        <span className="callback__icon" aria-hidden="true">
          <Icon name="phone" />
        </span>
        <div>
          <h2 className="callback__title">Zamów telefon – oddzwonimy w 60 sekund</h2>
          <p className="callback__sub">Zostaw numer, a doradca od razu do Ciebie zadzwoni.</p>
        </div>
      </div>
      {state.ok ? (
        <p className="callback__ok" role="status">
          <Icon name="check" /> {state.message}
        </p>
      ) : (
        <form action={action} className="callback__form" noValidate>
          <Honeypot />
          <input type="hidden" name="pagePath" value={pathname} />
          <input type="hidden" name="topic" value={topic} />
          <div className="callback__row">
            <label className="sr-only" htmlFor={`${id}-phone`}>
              Numer telefonu
            </label>
            <input
              id={`${id}-phone`}
              className="input"
              type="tel"
              name="phone"
              autoComplete="tel"
              inputMode="tel"
              placeholder="Twój numer telefonu"
              defaultValue={v.phone}
              required
              {...invalid(state, "phone")}
            />
            <SubmitButton className="btn">Zadzwońcie do mnie</SubmitButton>
          </div>
          <label className="check callback__consent">
            <input type="checkbox" name="consent" required {...invalid(state, "consent")} />
            <span>
              Zgadzam się na telefon w sprawie oferty. Szczegóły w <Link href="/polityka-prywatnosci/">polityce prywatności</Link>.
            </span>
          </label>
          <FormAlert state={state} />
        </form>
      )}
    </div>
  );
}
