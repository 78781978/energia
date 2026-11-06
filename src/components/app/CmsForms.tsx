"use client";

import { useActionState, useMemo, useRef, useState } from "react";
import { saveBanner, saveCategoryContent, savePost, saveServiceContent, saveSiteSettings } from "@/app/actions/cms";
import { initialFormState, type FormState } from "@/lib/forms";
import { FieldError, FormAlert, SubmitButton, invalid } from "@/components/forms";
import { Icon } from "@/components/Icon";
import { renderMarkdown, toBlocks } from "@/lib/markdown";
import { ctaLabel } from "@/lib/cta";

/* ---------------------------------------------------------------- pola pomocnicze */

function Counter({ value, max, ideal }: { value: string; max: number; ideal: [number, number] }) {
  const n = value.length;
  const ok = n >= ideal[0] && n <= ideal[1];
  return (
    <span className="hint" style={{ color: n > max ? "var(--red-btn)" : ok ? "var(--ok)" : undefined }}>
      {n} znaków {ok ? "· długość w sam raz dla Google" : `· zalecane ${ideal[0]}–${ideal[1]}`}
    </span>
  );
}

function TextField({
  name,
  label,
  state,
  defaultValue,
  hint,
  counter,
  textarea,
  rows = 3,
  placeholder,
}: {
  name: string;
  label: string;
  state: FormState;
  defaultValue: string;
  hint?: string;
  counter?: { max: number; ideal: [number, number] };
  textarea?: boolean;
  rows?: number;
  placeholder?: string;
}) {
  const [v, setV] = useState(defaultValue);
  const common = { id: `f-${name}`, name, value: v, placeholder, onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setV(e.target.value), ...invalid(state, name) };
  return (
    <div className="field">
      <label htmlFor={`f-${name}`}>{label}</label>
      {textarea ? <textarea className="textarea" rows={rows} {...common} /> : <input className="input" {...common} />}
      {counter && <Counter value={v} {...counter} />}
      {hint && <span className="hint">{hint}</span>}
      <FieldError state={state} name={name} />
    </div>
  );
}

/* ---------------------------------------------------------------- edytor treści (markdown) */

const TOOLS: { label: string; title: string; before: string; after?: string; line?: boolean; placeholder: string }[] = [
  { label: "H2", title: "Śródtytuł", before: "## ", line: true, placeholder: "Śródtytuł" },
  { label: "H3", title: "Mniejszy śródtytuł", before: "### ", line: true, placeholder: "Podtytuł" },
  { label: "B", title: "Pogrubienie", before: "**", after: "**", placeholder: "pogrubiony tekst" },
  { label: "• Lista", title: "Lista punktowana", before: "- ", line: true, placeholder: "punkt listy" },
  { label: "Link", title: "Link", before: "[", after: "](/kontakt/)", placeholder: "tekst linku" },
  { label: "Przycisk", title: "Przycisk (CTA)", before: "{{cta|", after: "}}", line: true, placeholder: "UMÓW ROZMOWĘ Z DORADCĄ" },
  { label: "Wyróżnienie", title: "Zdanie wyróżnione nad przyciskami", before: "{{callout|", after: "}}", line: true, placeholder: "Krótkie zdanie podsumowujące" },
];

export function MarkdownEditor({ name, defaultValue, state, rows = 22 }: { name: string; defaultValue: string; state: FormState; rows?: number }) {
  const [v, setV] = useState(defaultValue);
  const [tab, setTab] = useState<"edit" | "preview">("edit");
  const ref = useRef<HTMLTextAreaElement>(null);
  const blocks = useMemo(() => (tab === "preview" ? toBlocks(v) : []), [tab, v]);

  function apply(t: (typeof TOOLS)[number]) {
    const el = ref.current;
    if (!el) return;
    const { selectionStart: s, selectionEnd: e } = el;
    const sel = v.slice(s, e) || t.placeholder;
    let insert = t.before + sel + (t.after ?? "");
    let start = s;
    if (t.line) {
      const lineStart = v.lastIndexOf("\n", s - 1) + 1;
      const prefixNl = s === lineStart ? "" : "\n";
      insert = prefixNl + insert + "\n";
      start = s;
    }
    const next = v.slice(0, start) + insert + v.slice(e);
    setV(next);
    requestAnimationFrame(() => {
      el.focus();
      const pos = start + insert.length;
      el.setSelectionRange(pos, pos);
    });
  }

  return (
    <div className="field">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <label htmlFor={`f-${name}`} style={{ fontSize: 14, fontWeight: 700 }}>Treść</label>
        <div className="tabs" style={{ margin: 0 }}>
          <a href="#" aria-current={tab === "edit" ? "page" : undefined} onClick={(e) => (e.preventDefault(), setTab("edit"))}>
            Edycja
          </a>
          <a href="#" aria-current={tab === "preview" ? "page" : undefined} onClick={(e) => (e.preventDefault(), setTab("preview"))}>
            Podgląd
          </a>
        </div>
      </div>
      <div hidden={tab !== "edit"}>
        <div className="btn-row" style={{ gap: 6, marginBottom: 8 }} role="toolbar" aria-label="Formatowanie">
          {TOOLS.map((t) => (
            <button key={t.label} type="button" className="btn btn--ghost btn--sm" title={t.title} onClick={() => apply(t)} style={{ minHeight: 36, padding: "4px 12px" }}>
              {t.label}
            </button>
          ))}
        </div>
        <textarea ref={ref} id={`f-${name}`} name={name} className="textarea" rows={rows} value={v} onChange={(e) => setV(e.target.value)} style={{ fontFamily: "ui-monospace, Menlo, Consolas, monospace", fontSize: 14, lineHeight: 1.6 }} {...invalid(state, name)} />
        <span className="hint">
          Pusta linia = nowy akapit. <code>## </code> śródtytuł, <code>- </code> lista, <code>**tekst**</code> pogrubienie. Przycisk: <code>{"{{cta|ZAMÓW UMOWĘ ONLINE}}"}</code> – przyciski ze słowami „online”, „portal”, „porównaj oferty” prowadzą do portalu, pozostałe do formularza kontaktowego. W jednym rzędzie do portalu prowadzi tylko pierwszy przycisk – kolejny kieruje do rozmowy z doradcą.
        </span>
      </div>
      {tab === "preview" && (
        <div className="prose card card--flat" style={{ maxWidth: "none", maxHeight: 640, overflow: "auto" }}>
          {blocks.map((b, i) =>
            b.type === "html" ? (
              <div key={i} dangerouslySetInnerHTML={{ __html: b.html }} />
            ) : (
              <div key={i} className={b.callout ? "cta-band" : "cta-band cta-band--plain"}>
                {b.callout && <p>{b.callout}</p>}
                <div className="btn-row">
                  {b.ctas.map((c, j) => (
                    <span key={c} className={`btn ${j ? "btn--secondary" : ""}`}>
                      {ctaLabel(c)}
                    </span>
                  ))}
                </div>
              </div>
            ),
          )}
        </div>
      )}
      <FieldError state={state} name={name} />
    </div>
  );
}

/* ---------------------------------------------------------------- FAQ */

export function FaqEditor({ defaultValue }: { defaultValue: { q: string; a: string }[] }) {
  const [items, setItems] = useState(defaultValue.length ? defaultValue : [{ q: "", a: "" }]);
  const set = (i: number, k: "q" | "a", val: string) => setItems((p) => p.map((x, j) => (j === i ? { ...x, [k]: val } : x)));
  const move = (i: number, d: number) =>
    setItems((p) => {
      const n = [...p];
      const [x] = n.splice(i, 1);
      n.splice(i + d, 0, x);
      return n;
    });
  return (
    <fieldset className="fieldset">
      <legend>Pytania i odpowiedzi (FAQ)</legend>
      <input type="hidden" name="faq" value={JSON.stringify(items)} />
      {items.map((it, i) => (
        <div key={i} className="ppe-card" style={{ gap: 10 }}>
          <div className="ppe-card__head">
            <strong className="small">Pytanie {i + 1}</strong>
            <div className="btn-row" style={{ gap: 4 }}>
              <button type="button" className="btn btn--ghost btn--sm" disabled={i === 0} onClick={() => move(i, -1)} aria-label="Przesuń wyżej" style={{ minHeight: 34 }}>
                ↑
              </button>
              <button type="button" className="btn btn--ghost btn--sm" disabled={i === items.length - 1} onClick={() => move(i, 1)} aria-label="Przesuń niżej" style={{ minHeight: 34 }}>
                ↓
              </button>
              <button type="button" className="btn btn--ghost btn--sm" onClick={() => setItems((p) => p.filter((_, j) => j !== i))} aria-label="Usuń pytanie" style={{ minHeight: 34 }}>
                <Icon name="trash" size={16} />
              </button>
            </div>
          </div>
          <input className="input" aria-label={`Pytanie ${i + 1}`} placeholder="Pytanie, np. Czy mogę kupić prąd online?" value={it.q} onChange={(e) => set(i, "q", e.target.value)} />
          <textarea className="textarea" aria-label={`Odpowiedź ${i + 1}`} rows={3} placeholder="Odpowiedź" value={it.a} onChange={(e) => set(i, "a", e.target.value)} />
        </div>
      ))}
      <div>
        <button type="button" className="btn btn--secondary btn--sm" onClick={() => setItems((p) => [...p, { q: "", a: "" }])}>
          <Icon name="plus" size={16} /> Dodaj pytanie
        </button>
      </div>
      <span className="hint">Puste pytania są pomijane. FAQ jest widoczne na stronie i oznaczone dla Google (dane strukturalne).</span>
    </fieldset>
  );
}

/* ---------------------------------------------------------------- formularze */

type ServiceData = {
  slug: string;
  h1: string;
  lead: string | null;
  body: string;
  tagline: string | null;
  ctas: string[];
  faq: { q: string; a: string }[];
  metaTitle: string | null;
  metaDescription: string | null;
  keywords: string[];
};

function SeoFields({ state, metaTitle, metaDescription, keywords }: { state: FormState; metaTitle: string | null; metaDescription: string | null; keywords?: string[] }) {
  return (
    <section className="panel" aria-labelledby="seo">
      <div className="panel__head">
        <h2 id="seo">Google i wyszukiwarki AI</h2>
      </div>
      <div className="form" style={{ gap: 16 }}>
        <TextField name="metaTitle" label="Tytuł w Google (meta title)" state={state} defaultValue={metaTitle ?? ""} counter={{ max: 70, ideal: [35, 60] }} />
        <TextField name="metaDescription" label="Opis w Google (meta description)" state={state} defaultValue={metaDescription ?? ""} textarea rows={3} counter={{ max: 170, ideal: [120, 160] }} />
        {keywords && <TextField name="keywords" label="Frazy kluczowe" state={state} defaultValue={keywords.join(", ")} hint="Oddziel przecinkami. Pomagają przy pisaniu treści – Google nie bierze ich pod uwagę bezpośrednio." />}
      </div>
    </section>
  );
}

export function ServiceContentForm({ data }: { data: ServiceData }) {
  const [state, action] = useActionState(saveServiceContent, initialFormState);
  return (
    <form action={action} className="stack">
      <input type="hidden" name="slug" value={data.slug} />
      <section className="panel">
        <div className="form" style={{ gap: 16 }}>
          <TextField name="h1" label="Nagłówek strony (H1)" state={state} defaultValue={data.h1} />
          <TextField name="lead" label="Wprowadzenie pod nagłówkiem" state={state} defaultValue={data.lead ?? ""} textarea rows={2} />
          <TextField name="ctas" label="Przyciski w nagłówku (jeden w linii)" state={state} defaultValue={data.ctas.join("\n")} textarea rows={3} hint="Pierwsze dwa są pokazywane pod nagłówkiem, np. ZAMÓW UMOWĘ ONLINE, UMÓW ROZMOWĘ Z DORADCĄ." />
          <MarkdownEditor name="body" defaultValue={data.body} state={state} />
          <TextField name="tagline" label="Zdanie podsumowujące na końcu (opcjonalnie)" state={state} defaultValue={data.tagline ?? ""} />
        </div>
      </section>
      <section className="panel">
        <FaqEditor defaultValue={data.faq} />
      </section>
      <SeoFields state={state} metaTitle={data.metaTitle} metaDescription={data.metaDescription} keywords={data.keywords} />
      <div className="save-bar">
        <FormAlert state={state} />
        <SubmitButton className="btn btn--lg" arrow={false} pending="Zapisywanie…">
          Zapisz i opublikuj
        </SubmitButton>
      </div>
    </form>
  );
}

export function CategoryContentForm({ data }: { data: { slug: string; h1: string; lead: string | null; body: string; short: string; ctas: string[]; metaTitle: string | null; metaDescription: string | null } }) {
  const [state, action] = useActionState(saveCategoryContent, initialFormState);
  return (
    <form action={action} className="stack">
      <input type="hidden" name="slug" value={data.slug} />
      <section className="panel">
        <div className="form" style={{ gap: 16 }}>
          <TextField name="h1" label="Nagłówek strony (H1)" state={state} defaultValue={data.h1} />
          <TextField name="lead" label="Wprowadzenie pod nagłówkiem" state={state} defaultValue={data.lead ?? ""} textarea rows={2} />
          <TextField name="short" label="Krótki opis na kafelku (strona główna)" state={state} defaultValue={data.short} counter={{ max: 120, ideal: [40, 90] }} />
          <TextField name="ctas" label="Przyciski w nagłówku (jeden w linii)" state={state} defaultValue={data.ctas.join("\n")} textarea rows={2} />
          <MarkdownEditor name="body" defaultValue={data.body} state={state} rows={14} />
        </div>
      </section>
      <SeoFields state={state} metaTitle={data.metaTitle} metaDescription={data.metaDescription} />
      <div className="save-bar">
        <FormAlert state={state} />
        <SubmitButton className="btn btn--lg" arrow={false} pending="Zapisywanie…">
          Zapisz i opublikuj
        </SubmitButton>
      </div>
    </form>
  );
}

type Settings = Record<"legalName" | "nip" | "krs" | "address" | "phone" | "email" | "openingHours" | "responseTime" | "linkedin" | "facebook", string | null>;

export function SiteSettingsForm({ data }: { data: Settings }) {
  const [state, action] = useActionState(saveSiteSettings, initialFormState);
  const f = (name: keyof Settings, label: string, hint?: string, placeholder?: string) => (
    <TextField name={name} label={label} state={state} defaultValue={data[name] ?? ""} hint={hint} placeholder={placeholder} />
  );
  return (
    <form action={action} className="stack">
      <section className="panel">
        <div className="panel__head">
          <h2>Dane firmy</h2>
        </div>
        <div className="form" style={{ gap: 16 }}>
          {f("legalName", "Pełna nazwa podmiotu", "Np. Energia w Biznesie sp. z o.o. – w stopce, polityce prywatności i regulaminie.")}
          <div className="form-row">
            {f("nip", "NIP")}
            {f("krs", "KRS", "Opcjonalnie")}
          </div>
          {f("address", "Adres siedziby", undefined, "ul. Przykładowa 1, 00-000 Miasto")}
        </div>
      </section>
      <section className="panel">
        <div className="panel__head">
          <h2>Kontakt</h2>
        </div>
        <div className="form" style={{ gap: 16 }}>
          <div className="form-row">
            {f("phone", "Telefon", "Widoczny w stopce, na stronie kontaktu i w widżecie pomocy.", "+48 000 000 000")}
            {f("email", "E-mail kontaktowy", undefined, "kontakt@twoja-domena.pl")}
          </div>
          <div className="form-row">
            {f("openingHours", "Godziny pracy", undefined, "pon.–pt. 8:00–17:00")}
            {f("responseTime", "Czas odpowiedzi (w zdaniu „Odpowiemy …”)", "Np. „w ciągu jednego dnia roboczego”, „w ciągu 2 godzin”.")}
          </div>
          <div className="form-row">
            {f("linkedin", "LinkedIn", undefined, "https://www.linkedin.com/company/…")}
            {f("facebook", "Facebook", undefined, "https://www.facebook.com/…")}
          </div>
        </div>
      </section>
      <div className="save-bar">
        <FormAlert state={state} />
        <SubmitButton className="btn btn--lg" arrow={false} pending="Zapisywanie…">
          Zapisz ustawienia
        </SubmitButton>
      </div>
    </form>
  );
}

export function BannerForm({ k, alt, href, hidden, defaultHref }: { k: string; alt: string; href: string | null; hidden: boolean; defaultHref: string | null }) {
  const [state, action] = useActionState(saveBanner, initialFormState);
  const [fileName, setFileName] = useState<string | null>(null);
  return (
    <form action={action} className="form" style={{ gap: 12 }}>
      <input type="hidden" name="key" value={k} />
      <label className="dropzone" style={{ padding: 16 }}>
        <input type="file" name="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => setFileName(e.target.files?.[0]?.name ?? null)} />
        <Icon name="upload" size={22} />
        <strong>{fileName ?? "Podmień grafikę (JPG, PNG, WebP)"}</strong>
        <span className="hint">Najlepiej min. 2400 px szerokości – grafika będzie pokazana w całości.</span>
      </label>
      <FieldError state={state} name="file" />
      <div className="field">
        <label htmlFor={`alt-${k}`}>Tekst z grafiki (opis dla Google i czytników ekranu)</label>
        <textarea id={`alt-${k}`} className="textarea" name="alt" rows={3} defaultValue={alt} />
      </div>
      <div className="field">
        <label htmlFor={`href-${k}`}>Link po kliknięciu {defaultHref ? <span className="opt">(domyślnie {defaultHref})</span> : <span className="opt">(opcjonalnie)</span>}</label>
        <input id={`href-${k}`} className="input" name="href" defaultValue={href ?? ""} placeholder={defaultHref ?? "/portal/wniosek/"} {...invalid(state, "href")} />
        <FieldError state={state} name="href" />
      </div>
      <label className="check">
        <input type="checkbox" name="hidden" defaultChecked={hidden} />
        <span>Ukryj ten baner na stronie</span>
      </label>
      <FormAlert state={state} />
      <div>
        <SubmitButton className="btn btn--sm" arrow={false} pending="Zapisywanie…">
          Zapisz baner
        </SubmitButton>
      </div>
    </form>
  );
}

type PostData = {
  id?: string;
  title: string;
  slug: string;
  excerpt: string | null;
  body: string;
  status: string;
  publishedAt: string;
  metaTitle: string | null;
  metaDescription: string | null;
  cover: { url: string; alt: string | null } | null;
};

export function PostForm({ data }: { data: PostData }) {
  const [state, action] = useActionState(savePost, initialFormState);
  const [fileName, setFileName] = useState<string | null>(null);
  return (
    <form action={action} className="stack">
      {data.id && <input type="hidden" name="id" value={data.id} />}
      <div className="two-col">
        <section className="panel">
          <div className="form" style={{ gap: 16 }}>
            <TextField name="title" label="Tytuł" state={state} defaultValue={data.title} />
            <TextField name="excerpt" label="Zajawka (krótki opis na liście wpisów)" state={state} defaultValue={data.excerpt ?? ""} textarea rows={2} counter={{ max: 300, ideal: [80, 200] }} />
            <MarkdownEditor name="body" defaultValue={data.body} state={state} rows={20} />
          </div>
        </section>
        <div className="stack">
          <section className="panel">
            <div className="panel__head">
              <h2>Publikacja</h2>
            </div>
            <div className="form" style={{ gap: 14 }}>
              <fieldset className="fieldset">
                <legend>Status</legend>
                <label className="check">
                  <input type="radio" name="status" value="DRAFT" defaultChecked={data.status !== "PUBLISHED"} />
                  <span>Szkic – niewidoczny na stronie</span>
                </label>
                <label className="check">
                  <input type="radio" name="status" value="PUBLISHED" defaultChecked={data.status === "PUBLISHED"} />
                  <span>Opublikowany</span>
                </label>
              </fieldset>
              <div className="field">
                <label htmlFor="f-publishedAt">Data publikacji</label>
                <input id="f-publishedAt" className="input" type="datetime-local" name="publishedAt" defaultValue={data.publishedAt} />
                <span className="hint">Data w przyszłości = wpis pojawi się automatycznie o tej porze.</span>
              </div>
              <TextField name="slug" label="Adres wpisu" state={state} defaultValue={data.slug} hint="Zostaw puste – utworzymy go z tytułu. Np. ceny-pradu-2027" />
            </div>
          </section>
          <section className="panel">
            <div className="panel__head">
              <h2>Zdjęcie główne</h2>
            </div>
            <div className="form" style={{ gap: 12 }}>
              {data.cover && <img src={data.cover.url} alt="" style={{ width: "100%", borderRadius: 12 }} />}
              <label className="dropzone" style={{ padding: 16 }}>
                <input type="file" name="cover" accept="image/jpeg,image/png,image/webp" onChange={(e) => setFileName(e.target.files?.[0]?.name ?? null)} />
                <Icon name="upload" size={22} />
                <strong>{fileName ?? (data.cover ? "Podmień zdjęcie" : "Dodaj zdjęcie")}</strong>
              </label>
              <FieldError state={state} name="cover" />
              <div className="field">
                <label htmlFor="f-coverAlt">Opis zdjęcia</label>
                <input id="f-coverAlt" className="input" name="coverAlt" defaultValue={data.cover?.alt ?? ""} />
              </div>
              {data.cover && (
                <label className="check">
                  <input type="checkbox" name="removeCover" />
                  <span>Usuń zdjęcie</span>
                </label>
              )}
            </div>
          </section>
          <SeoFields state={state} metaTitle={data.metaTitle} metaDescription={data.metaDescription} />
        </div>
      </div>
      <div className="save-bar">
        <FormAlert state={state} />
        <SubmitButton className="btn btn--lg" arrow={false} pending="Zapisywanie…">
          Zapisz
        </SubmitButton>
      </div>
    </form>
  );
}
