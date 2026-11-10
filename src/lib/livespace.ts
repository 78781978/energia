/**
 * Integracja z Livespace CRM (call center): zgłoszenia z formularzy trafiają do Livespace jako osoba kontaktowa
 * z zadaniem „Zadzwoń” przypisanym do handlowca, a przy „Zamów telefon – 60 s” dodatkowo z powiadomieniem w aplikacji.
 *
 * Konfiguracja w .env (klucze z Livespace → Ustawienia konta → API → Użytkownicy; API dostępne od pakietu Automation):
 *   LIVESPACE_URL=https://twojafirma.livespace.io
 *   LIVESPACE_API_KEY=…            LIVESPACE_API_SECRET=…
 *   LIVESPACE_USER_ID=…            (kto dostaje zadania i powiadomienia; jedno ID albo kilka po przecinku – pierwsza osoba jest
 *                                  właścicielem kontaktu i zadania, pozostałe są zapraszane; ID w panelu → Dane firmy → Livespace)
 *   LIVESPACE_FIELDS={…}           (opcjonalnie: pola dodatkowe kontaktu, np. {"taryfa":"ID","zuzycie":"ID"})
 *   LIVESPACE_TASK_TYPE_ID=…       (opcjonalnie: typ zadania; domyślnie typ o nazwie „Telefon”/„Rozmowa”/„Call”)
 *   LIVESPACE_SOURCE=…             (opcjonalnie: źródło kontaktu, np. „Strona www” – musi istnieć w Livespace)
 *   LIVESPACE_STATUS_FIELD_NAME / LIVESPACE_STATUS_VALUE (domyślnie „Status” = „Portal” – ustawiane w danych klienta i firmy)
 *   LIVESPACE_GROUP_ID=…           (opcjonalnie: grupa kontaktów, np. „kontaktowy” – ID z Ustawienia konta → API → Kontakty)
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

/** Osoby, które dostają zadania i powiadomienia: LIVESPACE_USER_ID (jedno ID albo kilka po przecinku). */
export function livespaceUserIds(): string[] {
  return (process.env.LIVESPACE_USER_ID || "")
    .split(/[,\s;]+/)
    .map((x) => x.trim())
    .filter(Boolean)
    .slice(0, 10);
}

/** Zaproszenie innych osób do zadania – wymaga ID zespołu i ról użytkownika (pobierane z Livespace). */
async function invitedUsers(ids: string[]): Promise<Record<string, unknown> | null> {
  try {
    const all = await livespaceCall<{ id: string; structures?: { id: string; roles?: { id: string }[] }[] }[]>("Default/User_getAll");
    const users: Record<string, { structure_id: string; roles: string[] }> = {};
    for (const id of ids) {
      const u = (all ?? []).find((x) => x.id === id);
      const st = u?.structures?.[0];
      if (st) users[id] = { structure_id: st.id, roles: (st.roles ?? []).map((r) => r.id) };
    }
    return Object.keys(users).length ? { users } : null;
  } catch {
    return null;
  }
}

/**
 * Pola dodatkowe kontaktu w Livespace (np. „Taryfa”, „Zużycie roczne”): LIVESPACE_FIELDS='{"taryfa":"ID pola",…}'.
 * ID pól: Livespace → Ustawienia konta → API → Kontakty. Klucze: patrz CrmLead.fields.
 */
function datasetFor(fields?: Record<string, string | null | undefined>): Record<string, string> | null {
  if (!fields) return null;
  let map: Record<string, string> = {};
  try {
    map = JSON.parse(process.env.LIVESPACE_FIELDS || "{}");
  } catch {
    return null;
  }
  const out: Record<string, string> = {};
  for (const [k, id] of Object.entries(map)) if (id && fields[k]) out[id] = String(fields[k]).slice(0, 1000);
  return Object.keys(out).length ? out : null;
}

/** Usuwa puste pola, żeby nie nadpisywać danych w Livespace pustymi wartościami. */
function clean<T extends Record<string, unknown>>(o: T): Record<string, unknown> {
  return Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined && v !== null && v !== "" && !(Array.isArray(v) && !v.length)));
}

type LsList = { company?: { id: string; nip?: string | null }[]; contact?: { id: string }[] };

/** Firma o podanym NIP (dokładne dopasowanie). */
async function findCompanyByNip(nip: string): Promise<string | null> {
  try {
    const r = await livespaceCall<LsList>("Contact/getAll", { type: "company", nip, condition: "equal", limit: 5 });
    const hit = (r?.company ?? []).find((c) => (c.nip || "").replace(/\D/g, "") === nip) ?? null;
    return hit?.id ?? null;
  } catch (e) {
    console.error("[livespace] szukanie firmy:", (e as Error).message);
    return null;
  }
}

/** Osoba o podanym e-mailu albo numerze telefonu. */
async function findContact(email?: string | null, phone?: string | null): Promise<string | null> {
  const tries: Record<string, string>[] = [];
  if (email) tries.push({ emails: email });
  const digits = (phone || "").replace(/\D/g, "").replace(/^48(?=\d{9}$)/, "");
  if (digits.length >= 9) tries.push({ phones: digits });
  for (const q of tries) {
    try {
      const r = await livespaceCall<LsList>("Contact/getAll", { type: "contact", ...q, condition: "equal", limit: 2 });
      const id = r?.contact?.[0]?.id;
      if (id) return id;
    } catch (e) {
      console.error("[livespace] szukanie osoby:", (e as Error).message);
    }
  }
  return null;
}

type LsField = { id: string; name: string; type?: string; answers?: { id: string; name: string }[] };
const statusCache: Record<string, { v: Record<string, string> | null; at: number }> = {};

/**
 * Status „Portal” w danych klienta: pole o nazwie „Status” (LIVESPACE_STATUS_FIELD_NAME) z odpowiedzią „Portal”
 * (LIVESPACE_STATUS_VALUE) – wyszukiwane automatycznie w polach dodatkowych Livespace, osobno dla osób i firm.
 */
export async function portalStatus(object: "contact" | "company"): Promise<Record<string, string> | null> {
  const c = statusCache[object];
  if (c && Date.now() - c.at < 6 * 3600e3) return c.v;
  const fieldName = (process.env.LIVESPACE_STATUS_FIELD_NAME || "Status").toLowerCase();
  const value = (process.env.LIVESPACE_STATUS_VALUE || "Portal").toLowerCase();
  let v: Record<string, string> | null = null;
  try {
    const data = await livespaceCall<Record<string, LsField[]>>("Default/getDatasets", { object });
    const fields = Object.values(data ?? {}).flat();
    const field = fields.find((f) => f.name?.trim().toLowerCase() === fieldName) ?? fields.find((f) => f.name?.toLowerCase().includes(fieldName));
    if (field) {
      const answer = field.answers?.find((a) => a.name?.trim().toLowerCase() === value);
      if (answer) v = { [field.id]: answer.id };
      else if (!field.answers?.length) v = { [field.id]: process.env.LIVESPACE_STATUS_VALUE || "Portal" };
    }
  } catch (e) {
    console.error("[livespace] pola dodatkowe:", (e as Error).message);
  }
  statusCache[object] = { v, at: Date.now() };
  return v;
}

let sourceCache: { v: string | null; at: number } | null = null;
/** Źródło pozyskania: LIVESPACE_SOURCE albo „Portal”, jeśli taka pozycja istnieje w Livespace. */
async function portalSource(): Promise<string | undefined> {
  if (process.env.LIVESPACE_SOURCE) return process.env.LIVESPACE_SOURCE;
  if (sourceCache && Date.now() - sourceCache.at < 6 * 3600e3) return sourceCache.v ?? undefined;
  let v: string | null = null;
  try {
    const list = await livespaceCall<string[]>("Default/getSourceList");
    v = (list ?? []).find((x) => x.trim().toLowerCase() === (process.env.LIVESPACE_STATUS_VALUE || "Portal").toLowerCase()) ?? null;
  } catch {
    v = null;
  }
  sourceCache = { v, at: Date.now() };
  return v ?? undefined;
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
  /** wartości do pól dodatkowych Livespace (mapowanie w LIVESPACE_FIELDS): taryfa, zuzycie, taryfa_gaz, zuzycie_gaz, ppe, sprzedawca, koniec_umowy, lata, model_ceny, moc_umowna, osd */
  fields?: Record<string, string | null | undefined>;
  /** dodatkowe linie notatki (np. dane zamówienia z portalu) */
  details?: string[];
  /** tytuł zadania zamiast domyślnego */
  taskTitle?: string;
  regon?: string | null;
  address?: { street?: string | null; postcode?: string | null; city?: string | null } | null;
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
  /** pliki do dołączenia w Livespace (podpisane, krótkotrwałe linki z portalu) */
  files?: { name: string; url: string }[];
};

/**
 * Wysyła zgłoszenie do Livespace: osoba + zadanie (+ powiadomienie dla pilnych „Zamów telefon”).
 * Zwraca ID osoby w Livespace. Rzuca LivespaceError – wywołujący zapisuje błąd i nie blokuje klienta.
 */
export async function pushLeadToLivespace(lead: CrmLead): Promise<{ contactId: string; todoId: string | null }> {
  const urgent = lead.kind === "TELEFON";
  const userIds = livespaceUserIds();
  const userId = userIds[0];
  const words = (lead.name || "").trim().split(/\s+/).filter(Boolean);
  const firstname = words.length ? words[0] : urgent ? "Prośba o telefon" : "Zapytanie ze strony";
  const lastname = words.length > 1 ? words.slice(1).join(" ") : lead.phone || lead.email || "(bez nazwiska)";
  const digits = (lead.phone || "").replace(/\D/g, "").replace(/^48(?=\d{9}$)/, "");
  // numery komórkowe w Polsce: 45, 50, 51, 53, 57, 60, 66, 69, 72, 73, 78, 79, 88
  const mobile = digits.length === 9 && /^(45|50|51|53|57|60|66|69|72|73|78|79|88)/.test(digits);

  const note = [
    lead.kind === "WNIOSEK" ? null : `${lead.kindLabel} – formularz na stronie Energia w Biznesie`,
    lead.topic && `Temat: ${lead.topic}`,
    lead.message && `Wiadomość: ${lead.message}`,
    ...(lead.details ?? []),
    lead.page && `Strona: ${lead.page}`,
    lead.adminUrl && `Panel portalu: ${lead.adminUrl}`,
  ]
    .filter(Boolean)
    .join("\n");

  const phones = lead.phone ? [{ phone_no: lead.phone, type: mobile ? 2 : 1, is_default: true }] : undefined;
  const emails = lead.email ? [{ email: lead.email, is_default: true }] : undefined;
  const addresses = lead.address?.city
    ? [{ street: lead.address.street ?? "", postcode: lead.address.postcode ?? "", city: lead.address.city, country: "Polska" }]
    : undefined;
  const dataset = datasetFor(lead.fields) ?? undefined;
  const [statusContact, statusCompany, source] = await Promise.all([portalStatus("contact"), portalStatus("company"), portalSource()]);
  const companyDataset = dataset || statusCompany ? { ...(dataset ?? {}), ...(statusCompany ?? {}) } : undefined;
  const groups = process.env.LIVESPACE_GROUP_ID ? [process.env.LIVESPACE_GROUP_ID] : undefined;
  const nip = (lead.nip || "").replace(/\D/g, "") || null;

  // 1) firma: ta sama firma (NIP) jest aktualizowana zamiast tworzenia duplikatu – dane z portalu nadpisują stare
  let companyId: string | null = null;
  if (lead.company && nip) {
    companyId = await findCompanyByNip(nip);
    const company = clean({
      name: lead.company,
      nip,
      regon: lead.regon || undefined,
      addresses,
      // status „Portal” tylko dla nowej firmy – istniejącej nie zmieniamy statusu ustawionego przez handlowca
      dataset: companyId ? dataset : companyDataset,
      groups,
      ...(companyId ? {} : { owner_id: userId, company_source: source }),
    });
    if (companyId) await livespaceCall("Contact/editCompany", { company: { id: companyId, ...company } });
    else companyId = (await livespaceCall<{ company?: { id?: string } }>("Contact/addCompany", { company }))?.company?.id ?? null;
  }

  // 2) osoba: szukamy po e-mailu, potem po telefonie; istniejąca jest aktualizowana
  const existingContact = await findContact(lead.email, lead.phone);
  const contact = clean({
    firstname,
    lastname,
    note,
    phones,
    emails,
    company: lead.company ? clean({ name: lead.company, nip: nip || undefined, regon: lead.regon || undefined }) : undefined,
    addresses: companyId ? undefined : addresses,
    groups,
    dataset: (() => {
      const d = { ...(companyId ? {} : (dataset ?? {})), ...(existingContact ? {} : (statusContact ?? {})) };
      return Object.keys(d).length ? d : undefined;
    })(),
    ...(existingContact ? {} : { owner_id: userId, contact_source: source }),
  });
  let contactId: string | null = existingContact;
  if (existingContact) {
    // nie nadpisujemy imienia i nazwiska zastępczym tekstem, gdy klient go nie podał
    if (!words.length) {
      delete contact.firstname;
      delete contact.lastname;
    }
    await livespaceCall("Contact/editContact", { contact: { id: existingContact, ...contact } });
  } else {
    contactId = (await livespaceCall<{ contact?: { id?: string } }>("Contact/addContact", { contact }))?.contact?.id ?? null;
  }
  if (!contactId) throw new LivespaceError("Livespace nie zwrócił ID osoby.");

  // 3) historia: każde zgłoszenie jako notatka na profilu firmy (albo osoby)
  try {
    if (companyId) await livespaceCall("Contact/addCompanyNote", { company: { id: companyId, note, permission: 1 } });
    else if (existingContact) await livespaceCall("Contact/addContactNote", { contact: { id: contactId, note, permission: 1 } });
  } catch (e) {
    console.error("[livespace] notatka:", (e as Error).message);
  }

  // 4) pliki (faktury) – Livespace pobiera je z podpisanego linku portalu
  for (const f of lead.files ?? []) {
    try {
      if (companyId) await livespaceCall("Contact/editCompany", { company: { id: companyId, file: { url: f.url } } });
      else await livespaceCall("Contact/editContact", { contact: { id: contactId, file: { url: f.url } } });
    } catch (e) {
      console.error(`[livespace] plik ${f.name}:`, (e as Error).message);
    }
  }

  let todoId: string | null = null;
  const typeId = await callTypeId();
  const todoBase = {
    title: lead.taskTitle ?? (urgent ? `PILNE: oddzwoń w 60 s – ${lead.phone}` : `${lead.kindLabel}: ${lead.name || lead.phone || lead.email}`),
    date: lsDate(),
    description: note,
    priority: urgent ? 1 : 0,
    is_completed: false,
    ...(typeId ? { type_id: typeId } : {}),
    objects: [{ type: "contact", id: contactId }, ...(companyId ? [{ type: "company", id: companyId }] : [])],
  };
  // zadanie przypisane do pierwszej osoby; pozostałe osoby zaproszone do tego samego zadania
  const others = userIds.slice(1);
  const invited = others.length ? await invitedUsers(others) : null;
  try {
    const todo = await livespaceCall<{ todo?: { id?: string } }>("Todo/addTodo", {
      todo: { ...todoBase, ...(userId ? { user_id: userId } : {}), ...(invited ? { invited } : {}) },
    });
    todoId = todo?.todo?.id ?? null;
  } catch (e) {
    if (!invited) throw e;
    // gdyby Livespace nie przyjął zaproszeń – osobne zadanie dla każdej osoby
    console.error("[livespace] zaproszenie do zadania:", (e as Error).message);
    for (const [i, uid] of userIds.entries()) {
      const t = await livespaceCall<{ todo?: { id?: string } }>("Todo/addTodo", { todo: { ...todoBase, user_id: uid } });
      if (i === 0) todoId = t?.todo?.id ?? null;
    }
  }

  // powiadomienia w Livespace: „Zamów telefon” i nowe zamówienia z portalu
  if (urgent || lead.kind === "WNIOSEK") {
    const text = urgent ? `PILNE: klient prosi o telefon w ciągu 60 sekund – ${lead.phone}` : `Nowe zamówienie z portalu: ${lead.company ?? lead.name ?? ""}`.trim();
    for (const uid of userIds) {
      try {
        await livespaceCall("Crm/notification_send", { user_id: uid, text, type: "external", url: "/" });
      } catch (e) {
        console.error("[livespace] powiadomienie:", (e as Error).message);
      }
    }
  }
  return { contactId, todoId };
}
