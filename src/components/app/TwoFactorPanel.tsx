import QRCode from "qrcode";
import { otpauthUrl } from "@/lib/totp";
import { begin2fa } from "@/app/actions/account";
import { fmtDateTime } from "@/components/app/ui";
import { SubmitButton } from "@/components/forms";
import { Icon } from "@/components/Icon";
import { Confirm2faForm, Disable2faForm } from "@/components/app/SecurityForms";

type U = { email: string; totpSecret: string | null; totpEnabledAt: Date | null; backupCodes: string | null };

/** Konfiguracja logowania dwuetapowego (TOTP) – portal klienta i panel administratora. */
export async function TwoFactorPanel({ user, mandatory = false }: { user: U; mandatory?: boolean }) {
  const pending = user.totpSecret && !user.totpEnabledAt;
  const qr = pending ? await QRCode.toDataURL(otpauthUrl(user.totpSecret!, user.email), { margin: 1, width: 360 }) : null;
  const backupLeft = user.backupCodes ? (JSON.parse(user.backupCodes) as string[]).length : 0;
  return (
    <section className="panel" aria-labelledby="bezpieczenstwo">
      <div className="panel__head">
        <h2 id="bezpieczenstwo">Bezpieczeństwo – logowanie dwuetapowe</h2>
        {user.totpEnabledAt ? <span className="badge badge--ok">Włączone</span> : <span className="badge">Wyłączone</span>}
      </div>
      <p className="muted" style={{ marginTop: 0 }}>
        Po włączeniu przy logowaniu podasz dodatkowo 6-cyfrowy kod z aplikacji w telefonie (Google Authenticator, Microsoft Authenticator, Authy).
      </p>
      {user.totpEnabledAt ? (
        <>
          <p className="small">
            Włączone {fmtDateTime(user.totpEnabledAt)} · pozostałe kody zapasowe: {backupLeft}
            {backupLeft <= 2 && " – wyłącz i włącz ponownie 2FA, aby wygenerować nowe kody"}
          </p>
          {mandatory ? <p className="small muted">Dla administratorów logowanie dwuetapowe jest obowiązkowe.</p> : <Disable2faForm />}
        </>
      ) : pending && qr ? (
        <div className="qr-box">
          <img src={qr} alt="Kod QR do aplikacji uwierzytelniającej" width={180} height={180} />
          <div className="stack" style={{ gap: 8, flex: "1 1 280px" }}>
            <ol style={{ margin: 0, paddingLeft: 20 }}>
              <li>Zeskanuj kod QR w aplikacji uwierzytelniającej.</li>
              <li>
                Albo wpisz klucz ręcznie: <code style={{ wordBreak: "break-all" }}>{user.totpSecret!.replace(/(.{4})/g, "$1 ").trim()}</code>
              </li>
              <li>Wpisz kod wyświetlony w aplikacji.</li>
            </ol>
            <Confirm2faForm />
          </div>
        </div>
      ) : (
        <form action={begin2fa}>
          <SubmitButton className="btn" arrow={false} pending="Przygotowuję…">
            <Icon name="lock" size={18} /> Skonfiguruj logowanie dwuetapowe
          </SubmitButton>
        </form>
      )}
    </section>
  );
}
