import { requireClient } from "@/lib/auth";
import { db } from "@/lib/db";
import { mediaUrl } from "@/lib/storage";
import { meterRows } from "@/lib/meters";
import { PageHead, fmtDate, fmtDateTime } from "@/components/app/ui";
import { Icon } from "@/components/Icon";
import { AccountForm } from "./AccountForm";
import { AvatarForm, ConsentsForm, DeletionForm, PasswordForm } from "@/components/app/SecurityForms";
import { TwoFactorPanel } from "@/components/app/TwoFactorPanel";

export const metadata = { title: "Ustawienia konta" };

export default async function AccountPage() {
  const user = await requireClient();
  const me = await db.user.findUniqueOrThrow({ where: { id: user.id } });
  const deadlines = (await meterRows(user.id))
    .flatMap((r) => [
      r.noticeDate ? { date: r.noticeDate, label: `Termin wypowiedzenia – ${r.name || r.ppeNumber || "licznik"}` } : null,
      r.end ?? r.currentEnd ? { date: (r.end ?? r.currentEnd)!, label: `Koniec umowy – ${r.name || r.ppeNumber || "licznik"}` } : null,
    ])
    .filter((x): x is { date: Date; label: string } => Boolean(x) && x!.date > new Date())
    .sort((a, b) => +a.date - +b.date)
    .slice(0, 6);

  return (
    <>
      <PageHead title="Ustawienia konta" sub="Twoje dane, hasło, bezpieczeństwo, zgody i powiadomienia." />
      <div className="stack">
        <AccountForm email={me.email} name={me.name} phone={me.phone} />

        <section className="panel" aria-labelledby="logo">
          <div className="panel__head">
            <h2 id="logo">Logo firmy</h2>
          </div>
          <AvatarForm current={me.avatarStoredName ? mediaUrl(me.avatarStoredName) : null} />
        </section>

        <section className="panel" aria-labelledby="haslo">
          <div className="panel__head">
            <h2 id="haslo">Hasło</h2>
          </div>
          <PasswordForm />
        </section>

        <TwoFactorPanel user={me} />

        <section className="panel" aria-labelledby="zgody">
          <div className="panel__head">
            <h2 id="zgody">Zgody i powiadomienia</h2>
          </div>
          <ConsentsForm marketingEmail={me.marketingConsent} sms={me.smsConsent} newsletter={me.newsletterConsent} updatedAt={me.consentsUpdatedAt ? fmtDateTime(me.consentsUpdatedAt) : null} />
        </section>

        <section className="panel" aria-labelledby="kalendarz">
          <div className="panel__head">
            <h2 id="kalendarz">Kalendarz umów</h2>
            <a className="btn btn--secondary btn--sm" href="/api/portal/kalendarz/">
              <Icon name="download" size={16} /> Pobierz plik kalendarza (.ics)
            </a>
          </div>
          <p className="muted" style={{ marginTop: 0 }}>
            Dodaj terminy końca umów i wypowiedzeń do Google Calendar, Outlooka lub kalendarza w telefonie. Przypomnimy Ci o nich także e-mailem.
          </p>
          {deadlines.length ? (
            <ul className="side-list">
              {deadlines.map((d) => (
                <li key={d.label + d.date.toISOString()} style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                  <span>{d.label}</span>
                  <strong>{fmtDate(d.date)}</strong>
                </li>
              ))}
            </ul>
          ) : (
            <p className="small muted" style={{ margin: 0 }}>
              Brak terminów – uzupełnij datę końca umowy i okres wypowiedzenia przy licznikach.
            </p>
          )}
        </section>

        <section className="panel" aria-labelledby="rodo">
          <div className="panel__head">
            <h2 id="rodo">Twoje dane osobowe (RODO)</h2>
            <a className="btn btn--secondary btn--sm" href="/api/portal/eksport-danych/">
              <Icon name="download" size={16} /> Pobierz kopię danych
            </a>
          </div>
          <p className="muted" style={{ marginTop: 0 }}>
            Masz prawo do dostępu do danych, ich poprawiania, przenoszenia, ograniczenia przetwarzania i usunięcia. Szczegóły w Polityce prywatności.
          </p>
          <DeletionForm requestedAt={me.deletionRequestedAt ? fmtDate(me.deletionRequestedAt) : null} />
        </section>
      </div>
    </>
  );
}
