import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { getSiteSettings } from "@/lib/cms";
import { PageHead } from "@/components/app/ui";
import { SiteSettingsForm } from "@/components/app/CmsForms";
import { livespaceCall, livespaceConfigured } from "@/lib/livespace";

export const metadata = { title: "Dane firmy" };

type LsUser = { id: string; name?: string; email?: string };

async function livespaceTest() {
  try {
    const [users, types, sources] = await Promise.all([
      livespaceCall<LsUser[]>("Default/User_getAll"),
      livespaceCall<Record<string, string>>("Todo/getTypes"),
      livespaceCall<string[]>("Default/getSourceList").catch(() => [] as string[]),
    ]);
    return { ok: true as const, users: users ?? [], types: Object.entries(types ?? {}), sources: sources ?? [] };
  } catch (e) {
    return { ok: false as const, error: (e as Error).message };
  }
}

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ livespace?: string }> }) {
  await requireAdmin();
  const sp = await searchParams;
  const st = await getSiteSettings();
  const configured = livespaceConfigured();
  const test = configured && sp.livespace === "test" ? await livespaceTest() : null;
  const userId = process.env.LIVESPACE_USER_ID || "";
  const typeId = process.env.LIVESPACE_TASK_TYPE_ID || "";
  return (
    <>
      <PageHead title="Dane firmy" sub="Dane widoczne w stopce, na stronie kontaktu, w polityce prywatności i regulaminie oraz w danych dla Google." />
      <SiteSettingsForm data={st} />

      <div className="panel" id="livespace" style={{ marginTop: 24 }}>
        <div className="panel__head">
          <h2>Livespace – call center</h2>
          {configured && (
            <Link className="btn btn--sm btn--secondary" href="/admin/ustawienia/?livespace=test#livespace">
              Sprawdź połączenie
            </Link>
          )}
        </div>
        {!configured ? (
          <div className="small">
            <p>
              Zgłoszenia ze strony (w tym „Zamów telefon – 60 s”) mogą trafiać od razu do Livespace jako osoba z zadaniem „Zadzwoń” dla
              handlowca. Aby włączyć integrację, w pliku <code>.env</code> na serwerze ustaw:
            </p>
            <pre style={{ whiteSpace: "pre-wrap", background: "var(--cream)", padding: 12, borderRadius: 8 }}>
              {`LIVESPACE_URL=https://twojafirma.livespace.io
LIVESPACE_API_KEY=…
LIVESPACE_API_SECRET=…`}
            </pre>
            <p className="muted">
              Klucze: Livespace → Ustawienia konta → API → Użytkownicy (API jest dostępne od pakietu Automation). Po ponownym uruchomieniu
              aplikacji wróć tutaj i kliknij „Sprawdź połączenie”, aby wybrać handlowca, który dostaje zadania.
            </p>
          </div>
        ) : !test ? (
          <p className="small">
            Integracja włączona: <strong>{process.env.LIVESPACE_URL}</strong>.{" "}
            {userId ? "Zadania i powiadomienia trafiają do wybranego handlowca." : "Nie wybrano handlowca (LIVESPACE_USER_ID) – zadania będą bez przypisania."}
          </p>
        ) : !test.ok ? (
          <div className="alert alert--error">
            <p>Nie udało się połączyć: {test.error}</p>
          </div>
        ) : (
          <div className="small">
            <div className="alert alert--ok" style={{ marginBottom: 16 }}>
              <p>Połączenie z Livespace działa.</p>
            </div>
            <h3 style={{ fontSize: 16 }}>Handlowcy – wpisz ID wybranej osoby jako LIVESPACE_USER_ID</h3>
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Osoba</th>
                    <th>ID</th>
                  </tr>
                </thead>
                <tbody>
                  {test.users.map((u) => (
                    <tr key={u.id}>
                      <td>
                        {u.name} <span className="muted">{u.email}</span> {u.id === userId && <span className="badge badge--ok">wybrany</span>}
                      </td>
                      <td>
                        <code>{u.id}</code>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <h3 style={{ fontSize: 16, marginTop: 20 }}>Typy zadań (opcjonalnie LIVESPACE_TASK_TYPE_ID)</h3>
            <ul>
              {test.types.map(([id, name]) => (
                <li key={id}>
                  {name} – <code>{id}</code> {id === typeId && <span className="badge badge--ok">wybrany</span>}
                </li>
              ))}
            </ul>
            {test.sources.length > 0 && (
              <>
                <h3 style={{ fontSize: 16, marginTop: 20 }}>Źródła kontaktów (opcjonalnie LIVESPACE_SOURCE)</h3>
                <p>{test.sources.join(" · ")}</p>
              </>
            )}
          </div>
        )}
      </div>
    </>
  );
}
