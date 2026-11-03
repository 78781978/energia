"use client";

import { useActionState } from "react";
import { changePassword, confirm2fa, disable2fa, requestDeletion, updateConsents, uploadAvatar } from "@/app/actions/account";
import { initialFormState } from "@/lib/forms";
import { FieldError, FormAlert, SubmitButton, invalid } from "@/components/forms";

export function PasswordForm() {
  const [state, action] = useActionState(changePassword, initialFormState);
  return (
    <form action={action} className="form" style={{ gap: 12 }}>
      <div className="form-row form-row--3">
        <div className="field">
          <label htmlFor="pw-current">Obecne hasło</label>
          <input id="pw-current" className="input" type="password" name="current" autoComplete="current-password" {...invalid(state, "current")} />
          <FieldError state={state} name="current" />
        </div>
        <div className="field">
          <label htmlFor="pw-new">Nowe hasło</label>
          <input id="pw-new" className="input" type="password" name="password" autoComplete="new-password" {...invalid(state, "password")} />
          <FieldError state={state} name="password" />
        </div>
        <div className="field">
          <label htmlFor="pw-new2">Powtórz nowe hasło</label>
          <input id="pw-new2" className="input" type="password" name="password2" autoComplete="new-password" {...invalid(state, "password2")} />
          <FieldError state={state} name="password2" />
        </div>
      </div>
      <FormAlert state={state} />
      <div>
        <SubmitButton className="btn" arrow={false} pending="Zapisuję…">
          Zmień hasło
        </SubmitButton>
      </div>
    </form>
  );
}

export function Confirm2faForm() {
  const [state, action] = useActionState(confirm2fa, initialFormState);
  if (state.ok)
    return (
      <div className="stack" style={{ gap: 12 }}>
        <FormAlert state={state} />
        <p style={{ margin: 0 }}>
          <strong>Zapisz kody zapasowe</strong> – każdy działa jeden raz, gdy nie masz dostępu do telefonu. Nie pokażemy ich ponownie.
        </p>
        <div className="codes">
          {state.values?.codes?.split(" ").map((c) => (
            <span key={c}>{c}</span>
          ))}
        </div>
        <div>
          <a className="btn btn--secondary btn--sm" href="/portal/konto/">
            Gotowe
          </a>
        </div>
      </div>
    );
  return (
    <form action={action} className="form" style={{ gap: 12, maxWidth: 320 }}>
      <div className="field">
        <label htmlFor="totp-code">Kod z aplikacji</label>
        <input id="totp-code" className="input" name="code" inputMode="numeric" autoComplete="one-time-code" maxLength={6} placeholder="000000" {...invalid(state, "code")} />
        <FieldError state={state} name="code" />
      </div>
      <FormAlert state={state} />
      <div>
        <SubmitButton className="btn" arrow={false} pending="Sprawdzam…">
          Włącz logowanie dwuetapowe
        </SubmitButton>
      </div>
    </form>
  );
}

export function Disable2faForm() {
  const [state, action] = useActionState(disable2fa, initialFormState);
  return (
    <form action={action} className="form" style={{ gap: 12, maxWidth: 420 }}>
      <div className="field">
        <label htmlFor="d2fa-pw">Hasło (potwierdzenie)</label>
        <input id="d2fa-pw" className="input" type="password" name="password" autoComplete="current-password" {...invalid(state, "password")} />
        <FieldError state={state} name="password" />
      </div>
      <FormAlert state={state} />
      <div>
        <SubmitButton className="btn btn--ghost" arrow={false} pending="Wyłączam…">
          Wyłącz logowanie dwuetapowe
        </SubmitButton>
      </div>
    </form>
  );
}

export function ConsentsForm({ marketingEmail, sms, newsletter, updatedAt }: { marketingEmail: boolean; sms: boolean; newsletter: boolean; updatedAt: string | null }) {
  const [state, action] = useActionState(updateConsents, initialFormState);
  return (
    <form action={action} className="form" style={{ gap: 12 }}>
      <label className="check">
        <input type="checkbox" checked disabled />
        <span>Akceptacja Regulaminu i Polityki prywatności (wymagana do korzystania z portalu)</span>
      </label>
      <label className="check">
        <input type="checkbox" name="marketingEmail" defaultChecked={marketingEmail} />
        <span>Informacje handlowe i oferty e-mailem</span>
      </label>
      <label className="check">
        <input type="checkbox" name="sms" defaultChecked={sms} />
        <span>Powiadomienia i informacje handlowe SMS-em</span>
      </label>
      <label className="check">
        <input type="checkbox" name="newsletter" defaultChecked={newsletter} />
        <span>Newsletter – informacje z rynku energii, promocje i nowości dla firm</span>
      </label>
      <p className="hint" style={{ margin: 0 }}>
        Powiadomienia o zamówieniach, umowach i terminach wysyłamy zawsze – są częścią usługi.{updatedAt ? ` Ostatnia zmiana zgód: ${updatedAt}.` : ""}
      </p>
      <FormAlert state={state} />
      <div>
        <SubmitButton className="btn" arrow={false} pending="Zapisuję…">
          Zapisz zgody
        </SubmitButton>
      </div>
    </form>
  );
}

export function AvatarForm({ current }: { current: string | null }) {
  const [state, action] = useActionState(uploadAvatar, initialFormState);
  return (
    <form action={action} className="form" style={{ gap: 12 }}>
      <div style={{ display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
        <span className="app-user__avatar" style={{ width: 72, height: 72, fontSize: 14, background: "#fff", color: "var(--muted)", border: "1px dashed var(--line-strong)", overflow: "hidden" }}>
          {current ? <img src={current} alt="Logo firmy" style={{ width: "100%", height: "100%", objectFit: "contain" }} /> : "Logo"}
        </span>
        <input type="file" name="avatar" accept="image/png,image/jpeg,image/webp" className="input" style={{ maxWidth: 320 }} />
        <SubmitButton className="btn btn--secondary btn--sm" arrow={false} pending="Wysyłanie…">
          Zapisz logo
        </SubmitButton>
        {current && (
          <button className="btn btn--ghost btn--sm" type="submit" name="remove" value="1">
            Usuń
          </button>
        )}
      </div>
      <span className="hint">Logo firmy lub zdjęcie: PNG, JPG lub WebP, do 2 MB.</span>
      <FormAlert state={state} />
    </form>
  );
}

export function DeletionForm({ requestedAt }: { requestedAt: string | null }) {
  const [state, action] = useActionState(requestDeletion, initialFormState);
  if (requestedAt && !state.ok) return <p className="small" style={{ margin: 0 }}>Wniosek o usunięcie konta złożono {requestedAt}. Odpowiemy e-mailem w ciągu 30 dni.</p>;
  return (
    <form action={action} className="form" style={{ gap: 12, maxWidth: 520 }}>
      <label className="check">
        <input type="checkbox" name="confirm" {...invalid(state, "confirm")} />
        <span>Wycofuję zgody i proszę o usunięcie konta oraz danych osobowych (z wyjątkiem danych, które musimy przechowywać na podstawie przepisów, np. umów).</span>
      </label>
      <div className="field">
        <label htmlFor="del-pw">Hasło (potwierdzenie)</label>
        <input id="del-pw" className="input" type="password" name="password" autoComplete="current-password" {...invalid(state, "password")} />
        <FieldError state={state} name="password" />
      </div>
      <FormAlert state={state} />
      <div>
        <SubmitButton className="btn btn--ghost" arrow={false} pending="Wysyłanie…">
          Złóż wniosek o usunięcie konta
        </SubmitButton>
      </div>
    </form>
  );
}
