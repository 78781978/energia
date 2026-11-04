import { resendVerification } from "@/app/actions/account";
import { Icon } from "@/components/Icon";
import { SubmitButton } from "@/components/forms";

/** Pasek „potwierdź adres e-mail” – do czasu potwierdzenia nie można wybrać oferty ani przesłać podpisanej umowy. */
export function VerifyNotice({ email }: { email: string }) {
  return (
    <div className="alert alert--warn verify-bar" role="status">
      <Icon name="mail" />
      <p style={{ flex: "1 1 200px", minWidth: 0, margin: 0, overflowWrap: "anywhere" }}>
        <strong>Potwierdź adres e-mail.</strong> Wysłaliśmy link na <strong className="inline-strong">{email}</strong>. Po potwierdzeniu będziesz mógł wybrać ofertę i podpisać umowę.
      </p>
      <form action={resendVerification}>
        <SubmitButton className="btn btn--secondary btn--sm" pending="Wysyłanie…" arrow={false}>
          Wyślij link ponownie
        </SubmitButton>
      </form>
    </div>
  );
}
