"use client";

import Link from "next/link";
import { useActionState } from "react";
import { register } from "@/app/actions/auth";
import { initialFormState } from "@/lib/forms";
import { FieldError, FormAlert, SubmitButton, invalid } from "@/components/forms";
import { PASSWORD_MIN } from "@/lib/validators";

export function RegisterForm() {
  const [state, action] = useActionState(register, initialFormState);
  const v = state.values ?? {};
  return (
    <form action={action} className="form" noValidate>
      <div className="field">
        <label htmlFor="email">Adres e-mail</label>
        <input id="email" className="input" type="email" name="email" autoComplete="email" placeholder="firma@przyklad.pl" defaultValue={v.email} required {...invalid(state, "email")} />
        <FieldError state={state} name="email" />
      </div>
      <div className="form-row">
        <div className="field">
          <label htmlFor="password">Hasło</label>
          <input id="password" className="input" type="password" name="password" autoComplete="new-password" required minLength={PASSWORD_MIN} {...invalid(state, "password")} />
          <span className="hint">Min. {PASSWORD_MIN} znaków, litery i cyfry.</span>
          <FieldError state={state} name="password" />
        </div>
        <div className="field">
          <label htmlFor="password2">Powtórz hasło</label>
          <input id="password2" className="input" type="password" name="password2" autoComplete="new-password" required {...invalid(state, "password2")} />
          <FieldError state={state} name="password2" />
        </div>
      </div>
      <div className="form-row">
        <div className="field">
          <label htmlFor="name">
            Imię i nazwisko <span className="opt">(opcjonalnie)</span>
          </label>
          <input id="name" className="input" name="name" autoComplete="name" defaultValue={v.name} />
        </div>
        <div className="field">
          <label htmlFor="phone">
            Telefon <span className="opt">(opcjonalnie)</span>
          </label>
          <input id="phone" className="input" type="tel" name="phone" autoComplete="tel" placeholder="+48" defaultValue={v.phone} {...invalid(state, "phone")} />
          <FieldError state={state} name="phone" />
        </div>
      </div>
      <label className="check">
        <input type="checkbox" name="terms" required {...invalid(state, "terms")} />
        <span>
          Akceptuję <Link href="/regulamin/" target="_blank">regulamin portalu</Link> i zapoznałem/-am się z{" "}
          <Link href="/polityka-prywatnosci/" target="_blank">polityką prywatności</Link>.
        </span>
      </label>
      <FieldError state={state} name="terms" />
      <label className="check">
        <input type="checkbox" name="marketing" />
        <span>Chcę otrzymywać informacje o ofertach energii i zmianach na rynku (opcjonalnie).</span>
      </label>
      <FormAlert state={state} />
      <SubmitButton className="btn btn--lg btn--block" pending="Tworzę konto…">
        Utwórz konto
      </SubmitButton>
      <p className="small" style={{ margin: 0 }}>
        Masz już konto? <Link href="/portal/logowanie/">Zaloguj się</Link>
      </p>
    </form>
  );
}
