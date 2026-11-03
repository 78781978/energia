import { adminTwoFactorRequired, requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { PageHead, fmtDateTime } from "@/components/app/ui";
import { PasswordForm } from "@/components/app/SecurityForms";
import { TwoFactorPanel } from "@/components/app/TwoFactorPanel";
import { Icon } from "@/components/Icon";

export const metadata = { title: "Moje konto" };

export default async function AdminAccountPage() {
  const admin = await requireAdmin({ allowWithout2fa: true });
  const me = await db.user.findUniqueOrThrow({ where: { id: admin.id } });
  const mandatory = adminTwoFactorRequired();
  const logins = await db.auditLog.findMany({ where: { entityType: "Auth", entityId: admin.id }, orderBy: { createdAt: "desc" }, take: 10 });
  return (
    <>
      <PageHead title="Moje konto" sub={`${me.email} · hasło, logowanie dwuetapowe i ostatnie logowania`} />
      {mandatory && !me.totpEnabledAt && (
        <div className="alert alert--warn" style={{ marginBottom: 24 }}>
          <Icon name="lock" />
          <p>
            <strong>Włącz logowanie dwuetapowe, aby korzystać z panelu.</strong>
            Konto administratora ma dostęp do danych wszystkich klientów, dlatego drugi krok logowania jest obowiązkowy.
          </p>
        </div>
      )}
      <div className="stack">
        <TwoFactorPanel user={me} mandatory={mandatory} />
        <section className="panel" aria-labelledby="haslo">
          <div className="panel__head">
            <h2 id="haslo">Hasło</h2>
          </div>
          <PasswordForm />
        </section>
        <section className="panel" aria-labelledby="logowania">
          <div className="panel__head">
            <h2 id="logowania">Ostatnie logowania</h2>
          </div>
          {logins.length ? (
            <ul className="side-list">
              {logins.map((l) => {
                const ip = (JSON.parse(l.changes || "{}") as { ip?: [null, string] }).ip?.[1] ?? "-";
                return (
                  <li key={l.id} style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                    <span>{l.action === "login" ? "Udane logowanie" : "Nieudana próba"}</span>
                    <span className="muted small">
                      {fmtDateTime(l.createdAt)} · IP {ip}
                    </span>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="small muted">Brak zapisanych logowań.</p>
          )}
        </section>
      </div>
    </>
  );
}
