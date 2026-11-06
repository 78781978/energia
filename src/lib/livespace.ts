/**
 * Integracja z Livespace CRM (call center): zgłoszenia z formularzy trafiają do Livespace jako osoba kontaktowa
 * z zadaniem „Zadzwoń” przypisanym do handlowca, a przy „Zamów telefon – 60 s” dodatkowo z powiadomieniem w aplikacji.
 *
 * Konfiguracja w .env (klucze z Livespace → Ustawienia konta → API → Użytkownicy; API dostępne od pakietu Automation):
 *   LIVESPACE_URL=https://twojafirma.livespace.io
 *   LIVESPACE_API_KEY=…            LIVESPACE_API_SECRET=…
 *   LIVESPACE_USER_ID=…            (opcjonalnie: kto dostaje zadania i powiadomienia; ID w panelu → Dane firmy → Livespace)
 *   LIVESPACE_TASK_TYPE_ID=…       (opcjonalnie: typ zadania; domyślnie typ o nazwie „Telefon”/„Rozmowa”/„Call”)
 *   LIVESPACE_SOURCE=…             (opcjonalnie: źródło kontaktu, np. „Strona www” – musi istnieć w Livespace)
 * Dokumentacja API: https://api-docs.livespace.io/
 */
import { createHash } from "node:crypto";

type LsResponse<T = unknown> = { data: T; error: unknown; result: number; status: boolean };

export class LivespaceError extends Error {}

export function livespaceConfigured(): boolean {
  return Boolean(process.env.LIVESPACE_URL && process.env.LIVESPACE_API_KEY && process.env.LIVESPACE_API_SECRET);
}

function baseUrl(): string {
  const raw = (process.env.LIVESPACE_URL || "").trim().replace(/\/+$/, "");
  const url = /^https?:\/\//.test(raw) ? raw : `https://${raw}`;
  if (!/^https:\/\/[a-z0-9-]+\.livespace\.io$/i.test(url)) throw new LivespaceError("LIVESPACE_URL powinien mieć postać https://nazwa.livespace.io");
  return url;
}

/** Wywołanie metody API (token i podpis SHA-1 pobierane przed każdym wywołaniem – tak wymaga Livespace). */
export async function livespaceCall<T = unknown>(method: string, payload: Record<string, unknown> = {}): Promise<T> {
  if (!livespaceConfigured()) throw new LivespaceError("Integracja Livespace nie jest skonfigurowana.");
  const url = baseUrl();
  const key = process.env.LIVESPACE_API_KEY!;
  const secret = process.env.LIVESPACE_API_SECRET!;

  const tokRes = await fetch(`${url}/api/public/json/_Api/auth_call/_api_method/getToken`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
    body: new URLSearchParams({ _api_auth: "key", _api_key: key }),
    signal: AbortSignal.timeout(10000),
  });
  const tok = (await tokRes.json().catch(() => null)) as LsResponse<{ token?: string; session_id?: string }> | null;
  if (!tok?.status || !tok.data?.token || !tok.data?.session_id) throw new LivespaceError(`Brak autoryzacji Livespace (kod ${tok?.result ?? tokRes.status}). Sprawdź klucz API.`);

  const auth = {
    _api_auth: "key",
    _api_key: key,
    _api_sha: createHash("sha1").update(key + tok.data.token + secret).digest("hex"),
    _api_session: tok.data.session_id,
  };
  const res = await fetch(`${url}/api/public/json/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ ...auth, ...payload }),
    signal: AbortSignal.timeout(15000),
  });
  const json = (await res.json().catch(() => null)) as LsResponse<T> | null;
  if (!json?.status) {
    const err = json?.error ? JSON.stringify(json.error).slice(0, 300) : "";
    throw new LivespaceError(`Livespace ${method}: błąd ${json?.result ?? res.status}${err ? ` – ${err}` : ""}`);
  }
  return json.data;
}

/** Data w formacie Livespace („RRRR-MM-DD GG:MM:SS”) w strefie Polski. */
function lsDate(d = new Date()): string {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Warsaw", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" })
    .format(d)
    .replace("T", " ");
}

let typeCache: { id: string | null; at: number } | null = null;

/** Typ zadania: z LIVESPACE_TASK_TYPE_ID albo typ o nazwie „Telefon”/„Rozmowa telefoniczna”/„Call”. */
async function callTypeId(): Promise<string | null> {
  if (process.env.LIVESPACE_TASK_TYPE_ID) return process.env.LIVESPACE_TASK_TYPE_ID;
  if (typeCache && Date.now() - typeCache.at < 6 * 3600e3) return typeCache.id;
  try {
    const types = await livespaceCall<Record<string, string>>("Todo/getTypes");
    const entry = Object.entries(types ?? {}).find(([, n]) => /telefon|rozmow|zadzwo|call/i.test(n));
    typeCache = { id: entry?.[0] ?? null, at: Date.now() };
  } catch {
    typeCache = { id: null, at: Date.now() };
  }
  return typeCache.id;
}

export type CrmLead = {
  kind: "TELEFON" | "ROZMOWA" | "ANALIZA" | "KONTAKT" | "WSPOLPRACA" | "SZKOLENIE" | string;
  kindLabel: string;
  name?: string | null;
  company?: string | null;
  nip?: string | null;
  email?: string | null;
  phone?: string | null;
  topic?: string | null;
  message?: string | null;
  page?: string | null;
  adminUrl?: string | null;
};

/**
 * Wysyła zgłoszenie do Livespace: osoba + zadanie (+ powiadomienie dla pilnych „Zamów telefon”).
 * Zwraca ID osoby w Livespace. Rzuca LivespaceError – wywołujący zapisuje błąd i nie blokuje klienta.
 */
export async function pushLeadToLivespace(lead: CrmLead): Promise<{ contactId: string; todoId: string | null }> {
  const urgent = lead.kind === "TELEFON";
  const userId = process.env.LIVESPACE_USER_ID || undefined;
  const words = (lead.name || "").trim().split(/\s+/).filter(Boolean);
  const firstname = words.length ? words[0] : urgent ? "Prośba o telefon" : "Zapytanie ze strony";
  const lastname = words.length > 1 ? words.slice(1).join(" ") : lead.phone || lead.email || "(bez nazwiska)";
  const digits = (lead.phone || "").replace(/\D/g, "").replace(/^48(?=\d{9}$)/, "");
  // numery komórkowe w Polsce: 45, 50, 51, 53, 57, 60, 66, 69, 72, 73, 78, 79, 88
  const mobile = digits.length === 9 && /^(45|50|51|53|57|60|66|69|72|73|78|79|88)/.test(digits);

  const note = [
    `${lead.kindLabel} – formularz na stronie Energia w Biznesie`,
    lead.topic && `Temat: ${lead.topic}`,
    lead.message && `Wiadomość: ${lead.message}`,
    lead.page && `Strona: ${lead.page}`,
    lead.adminUrl && `Panel portalu: ${lead.adminUrl}`,
  ]
    .filter(Boolean)
    .join("\n");

  const contact: Record<string, unknown> = {
    firstname,
    lastname,
    note,
    ...(lead.phone ? { phones: [{ phone_no: lead.phone, type: mobile ? 2 : 1, is_default: true }] } : {}),
    ...(lead.email ? { emails: [{ email: lead.email, is_default: true }] } : {}),
    ...(lead.company ? { company: { name: lead.company, ...(lead.nip ? { nip: lead.nip } : {}) } } : {}),
    ...(process.env.LIVESPACE_SOURCE ? { contact_source: process.env.LIVESPACE_SOURCE } : {}),
    ...(userId ? { owner_id: userId } : {}),
  };
  const added = await livespaceCall<{ contact?: { id?: string } }>("Contact/addContact", { contact });
  const contactId = added?.contact?.id;
  if (!contactId) throw new LivespaceError("Livespace nie zwrócił ID nowej osoby.");

  let todoId: string | null = null;
  const typeId = await callTypeId();
  const todo = await livespaceCall<{ todo?: { id?: string } }>("Todo/addTodo", {
    todo: {
      title: urgent ? `PILNE: oddzwoń w 60 s – ${lead.phone}` : `${lead.kindLabel}: ${lead.name || lead.phone || lead.email}`,
      date: lsDate(),
      description: note,
      priority: urgent ? 1 : 0,
      is_completed: false,
      ...(userId ? { user_id: userId } : {}),
      ...(typeId ? { type_id: typeId } : {}),
      objects: [{ type: "contact", id: contactId }],
    },
  });
  todoId = todo?.todo?.id ?? null;

  if (urgent && userId) {
    try {
      await livespaceCall("Crm/notification_send", {
        user_id: userId,
        text: `PILNE: klient prosi o telefon w ciągu 60 sekund – ${lead.phone}`,
        type: "external",
        url: "/",
      });
    } catch (e) {
      console.error("[livespace] powiadomienie:", (e as Error).message);
    }
  }
  return { contactId, todoId };
}
