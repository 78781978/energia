"use client";

import Link from "next/link";
import Script from "next/script";
import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { submitWizard } from "@/app/actions/wizard";
import { trackFunnel } from "@/app/actions/public";
import { initialFormState } from "@/lib/forms";
import { FormAlert, SubmitButton } from "@/components/forms";
import { Icon, type IconName } from "@/components/Icon";
import { emptyPoint, PointsEditor, type CompanyDraft, type PointDraft } from "@/components/app/PointsEditor";
import { LEGAL_FORMS, MEDIA, PRICE_MODELS, TARIFFS_GAS, TARIFFS_POWER, USAGE_RANGES, type Media, type PriceModel } from "@/lib/constants";
import { PRICE_OPTIONS, priceLabel, STEP_TEXT, STEP7_BENEFITS, STEP7_HTML } from "@/lib/wizard";
import { isPlausiblePpe, isValidEmail, isValidNip, isValidPhone, isValidPostalCode, isValidRegon, passwordProblem } from "@/lib/validators";

const STEPS = ["Twoja firma", "Media", "Lata zakupu", "Wariant zakupu", "Taryfa i zużycie", "Faktury", "Liczniki", "Finalizacja"];
const STEP_ART = ["krok-1", "krok-1", "krok-2", "krok-3", "krok-4", "krok-5", "krok-6", "krok-7"].map((k) => `/img/kroki/${k}.jpg`);
const COMPANY_FIELDS = ["companyName", "nip", "regon", "contactName", "contactPhone", "contactEmail", "hqStreet", "hqPostalCode", "hqCity", "corrStreet", "corrPostalCode", "corrCity"];
function fieldStep(k: string): number {
  if (COMPANY_FIELDS.includes(k)) return 0;
  const map: Record<string, number> = { media: 1, years: 2, priceModels: 3, tariff: 4, annualUsageMWh: 4, annualUsageGasMWh: 4, invoicePower: 5, invoiceGas: 5, points: 6 };
  if (k.startsWith("point_")) return 6;
  return map[k] ?? 7;
}

const MODEL_ICON: Record<PriceModel, IconName> = {
  STALA: "shield",
  RDN: "chart",
  TRANSZE: "piggy",
  INDYWIDUALNA: "search",
  OZE: "leaf",
  PPA: "sun",
  UPPA: "wave",
  KOMPLEKSOWA: "plug",
  AUDYT_DYSTRYBUCJI: "scale",
  PRODUKTY_TECHNICZNE: "wrench",
  ANALIZA_OPTYMALNA: "chart",
};

const DRAFT_KEY = "eo_wizard_v2";

function visitorId(): string {
  try {
    let v = localStorage.getItem("eo_vid");
    if (!v) {
      v = (crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`).toString();
      localStorage.setItem("eo_vid", v);
    }
    return v;
  } catch {
    return "anon-visitor";
  }
}

type InvoiceRead = {
  medium: "PRAD" | "GAZ" | null;
  ppeNumber: string | null;
  meterNumber: string | null;
  tariff: string | null;
  seller: string | null;
  operator: string | null;
  street: string | null;
  postalCode: string | null;
  city: string | null;
  buyerName: string | null;
  buyerNip: string | null;
  found: number;
};

export function Wizard({
  company,
  points: initialPoints,
  years: yearOptions,
  loggedIn,
  turnstileSiteKey,
  initialMedia,
}: {
  company: CompanyDraft;
  points: PointDraft[];
  years: number[];
  loggedIn: boolean;
  turnstileSiteKey: string;
  initialMedia: Media | "";
}) {
  const [state, action] = useActionState(submitWizard, initialFormState);
  const [step, setStep] = useState(company.id ? 1 : 0);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [media, setMedia] = useState<Media | "">(initialMedia);
  const [years, setYears] = useState<number[]>([]);
  const [models, setModels] = useState<PriceModel[]>([]);
  const [tariff, setTariff] = useState("");
  const [tariffGas, setTariffGas] = useState("");
  const [usage, setUsage] = useState("");
  const [usageGas, setUsageGas] = useState("");
  const [invPower, setInvPower] = useState<string[]>([]);
  const [invGas, setInvGas] = useState<string[]>([]);
  const [c, setC] = useState<CompanyDraft>(company);
  const [points, setPoints] = useState<PointDraft[]>(initialPoints);
  const [pointsMode, setPointsMode] = useState<"choose" | "edit" | "skip">(initialPoints.length ? "edit" : "choose");
  const [reading, setReading] = useState(false);
  const [readMsg, setReadMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [startedAt, setStartedAt] = useState(0);
  const [pw, setPw] = useState("");
  const topRef = useRef<HTMLDivElement>(null);
  const powerRef = useRef<HTMLInputElement>(null);
  const gasRef = useRef<HTMLInputElement>(null);
  const restored = useRef(false);

  const withPower = media !== "GAZ";
  const withGas = media === "GAZ" || media === "PRAD_GAZ";

  // Szkic kreatora w przeglądarce (bez haseł i plików) – np. gdy ktoś musi się najpierw zalogować.
  useEffect(() => {
    setStartedAt(Date.now());
    try {
      const raw = sessionStorage.getItem(DRAFT_KEY);
      if (raw) {
        const d = JSON.parse(raw);
        if (d.media) setMedia(d.media);
        if (Array.isArray(d.years)) setYears(d.years.filter((y: number) => yearOptions.includes(y)));
        if (Array.isArray(d.models)) setModels(d.models);
        setTariff(d.tariff ?? "");
        setTariffGas(d.tariffGas ?? "");
        setUsage(d.usage ?? "");
        setUsageGas(d.usageGas ?? "");
        if (!company.id && d.company) setC((prev) => ({ ...prev, ...d.company, id: undefined }));
        if (!initialPoints.length && Array.isArray(d.points) && d.points.length) {
          setPoints(d.points);
          setPointsMode("edit");
        }
      }
    } catch {
      /* brak dostępu do pamięci przeglądarki */
    }
    restored.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    if (!restored.current) return;
    try {
      sessionStorage.setItem(DRAFT_KEY, JSON.stringify({ media, years, models, tariff, tariffGas, usage, usageGas, company: c, points }));
    } catch {
      /* ignoruj */
    }
  }, [media, years, models, tariff, tariffGas, usage, usageGas, c, points]);

  useEffect(() => {
    if (state.error) {
      setInvPower([]);
      setInvGas([]);
    }
    if (!state.fieldErrors) return;
    setErrors(state.fieldErrors);
    const steps = Object.keys(state.fieldErrors).filter((k) => k !== "login").map(fieldStep);
    if (steps.length) setStep(Math.min(...steps));
  }, [state]);

  useEffect(() => {
    trackFunnel(visitorId(), step + 1).catch(() => undefined);
    topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [step]);

  // Zmiana mediów: usuń warianty niedostępne dla nowego wyboru
  useEffect(() => {
    if (media) setModels((prev) => prev.filter((m) => PRICE_OPTIONS[media].includes(m)));
  }, [media]);

  const setField = (k: keyof CompanyDraft, v: string | boolean) => setC((prev) => ({ ...prev, [k]: v }));
  const setPoint = (key: string, k: keyof PointDraft, v: string) => setPoints((prev) => prev.map((p) => (p.key === key ? { ...p, [k]: v } : p)));

  function validate(s: number): Record<string, string> {
    const e: Record<string, string> = {};
    if (s === 0) {
      if (c.companyName.trim().length < 2) e.companyName = "Podaj nazwę firmy.";
      if (!isValidNip(c.nip)) e.nip = "Wpisz poprawny NIP (10 cyfr).";
      if (c.regon && !isValidRegon(c.regon)) e.regon = "Wpisz poprawny REGON (9 lub 14 cyfr).";
      if (!c.contactName.trim()) e.contactName = "Podaj imię i nazwisko.";
      if (!isValidPhone(c.contactPhone)) e.contactPhone = "Wpisz poprawny numer telefonu.";
      if (!isValidEmail(c.contactEmail)) e.contactEmail = "Wpisz poprawny adres e-mail.";
      if (!c.hqStreet.trim()) e.hqStreet = "Podaj ulicę i numer.";
      if (!isValidPostalCode(c.hqPostalCode)) e.hqPostalCode = "Format: 00-000.";
      if (!c.hqCity.trim()) e.hqCity = "Podaj miejscowość.";
      if (c.corrDifferent) {
        if (!c.corrStreet.trim()) e.corrStreet = "Podaj adres korespondencyjny.";
        if (!isValidPostalCode(c.corrPostalCode)) e.corrPostalCode = "Format: 00-000.";
        if (!c.corrCity.trim()) e.corrCity = "Podaj miejscowość.";
      }
    }
    if (s === 1 && !media) e.media = "Wybierz media, dla których chcesz otrzymać ofertę.";
    if (s === 2 && !years.length) e.years = "Wybierz co najmniej jeden rok.";
    if (s === 3 && !models.length) e.priceModels = "Zaznacz co najmniej jeden wariant zakupu.";
    if (s === 4) {
      const bad = (v: string) => v && !(Number(v.replace(",", ".")) >= 0);
      if (withPower && bad(usage)) e.annualUsageMWh = "Wpisz liczbę, np. 120.";
      if (withGas && bad(usageGas)) e.annualUsageGasMWh = "Wpisz liczbę, np. 80.";
    }
    if (s === 6 && pointsMode === "edit") {
      points.forEach((p, i) => {
        if (p.ppeNumber && !isPlausiblePpe(p.ppeNumber)) e[`point_${i}_ppeNumber`] = "Numer wygląda na niepoprawny – sprawdź go na fakturze.";
        if (p.postalCode && !isValidPostalCode(p.postalCode)) e[`point_${i}_postalCode`] = "Format: 00-000.";
      });
    }
    if (s === 7 && !loggedIn) {
      const pp = passwordProblem(pw);
      if (pp) e.password = pp;
    }
    return e;
  }

  function next() {
    const e = validate(step);
    setErrors(e);
    if (Object.keys(e).length) {
      requestAnimationFrame(() => (document.querySelector('[aria-invalid="true"], .error-text') as HTMLElement | null)?.scrollIntoView({ block: "center" }));
      return;
    }
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }

  async function readInvoices() {
    const files: { file: File; medium: "PRAD" | "GAZ" }[] = [
      ...Array.from(powerRef.current?.files ?? []).map((file) => ({ file, medium: "PRAD" as const })),
      ...Array.from(gasRef.current?.files ?? []).map((file) => ({ file, medium: "GAZ" as const })),
    ];
    if (!files.length) {
      setReadMsg({ ok: false, text: "Nie dodano faktur w poprzednim kroku. Wróć do kroku „Faktury” albo wpisz dane ręcznie." });
      return;
    }
    setReading(true);
    setReadMsg(null);
    const results: (InvoiceRead & { medium: "PRAD" | "GAZ" })[] = [];
    for (const { file, medium } of files.slice(0, 12)) {
      const body = new FormData();
      body.append("file", file);
      try {
        const r = await fetch("/api/odczyt-faktury/", { method: "POST", body });
        const j = (await r.json()) as { data?: InvoiceRead };
        if (j.data && j.data.found > 0) results.push({ ...j.data, medium });
      } catch {
        /* pomiń plik */
      }
    }
    setReading(false);
    if (!results.length) {
      setReadMsg({ ok: false, text: "Nie udało się automatycznie odczytać danych (np. faktura jest skanem). Wpisz dane ręcznie – fakturę i tak przekażemy doradcy." });
      setPointsMode("edit");
      if (!points.length) setPoints([emptyPoint(media === "GAZ" ? "GAZ" : "PRAD")]);
      return;
    }
    setPoints((prev) => {
      const out = [...prev];
      for (const r of results) {
        const ppe = r.ppeNumber ?? "";
        let idx = ppe ? out.findIndex((p) => p.ppeNumber.replace(/\s/g, "") === ppe) : -1;
        if (idx < 0) idx = out.findIndex((p) => p.medium === r.medium && !p.ppeNumber && !p.street && !p.meterNumber);
        const base = idx >= 0 ? out[idx] : emptyPoint(r.medium);
        const fill = (cur: string, v: string | null) => cur || v || "";
        const merged: PointDraft = {
          ...base,
          medium: r.medium,
          ppeNumber: fill(base.ppeNumber, r.ppeNumber),
          meterNumber: fill(base.meterNumber, r.meterNumber),
          street: fill(base.street, r.street),
          postalCode: fill(base.postalCode, r.postalCode),
          city: fill(base.city, r.city),
          currentSeller: fill(base.currentSeller, r.seller),
          operator: fill(base.operator, r.operator),
          tariff: fill(base.tariff, r.tariff),
        };
        if (idx >= 0) out[idx] = merged;
        else out.push(merged);
        if (r.tariff) {
          const group = r.medium === "GAZ" ? r.tariff.replace(/\..*$/, "") : r.tariff; // W-3.6 → W-3
          if (r.medium === "GAZ" && TARIFFS_GAS.includes(group)) setTariffGas((t) => t || group);
          if (r.medium === "PRAD" && TARIFFS_POWER.includes(group)) setTariff((t) => t || group);
        }
      }
      return out;
    });
    setPointsMode("edit");
    const n = results.length;
    setReadMsg({ ok: true, text: `Odczytano dane z ${n} ${n === 1 ? "faktury" : "faktur"}. Sprawdź je i uzupełnij brakujące pola.` });
  }

  const err = (k: string) =>
    errors[k] ? (
      <span className="error-text" id={`${k}-err`} role="alert">
        <Icon name="alert" size={16} /> {errors[k]}
      </span>
    ) : null;
  const inv = (k: string) => (errors[k] ? { "aria-invalid": true as const, "aria-describedby": `${k}-err` } : {});

  const pointsJson = useMemo(() => JSON.stringify(pointsMode === "edit" ? points.map(({ key: _k, ...p }) => p) : []), [points, pointsMode]);
  const text = (k: "s3" | "s4" | "s5" | "s6") => STEP_TEXT[k][media || "PRAD"];

  const F = (name: keyof CompanyDraft, label: string, extra: React.InputHTMLAttributes<HTMLInputElement> & { opt?: boolean } = {}) => {
    const { opt, ...rest } = extra;
    return (
      <div className="field">
        <label htmlFor={`w-${name}`}>
          {label} {opt && <span className="opt">(opcjonalnie)</span>}
        </label>
        <input id={`w-${name}`} className="input" name={name} value={c[name] as string} onChange={(e) => setField(name, e.target.value)} {...inv(name)} {...rest} />
        {err(name)}
      </div>
    );
  };

  const invoiceDrop = ({ name, label, names, setNames, inputRef, icon }: { name: string; label: string; names: string[]; setNames: (n: string[]) => void; inputRef: React.RefObject<HTMLInputElement | null>; icon: IconName }) => (
    <div className="field" key={name}>
      <span className="label">
        <Icon name={icon} size={18} /> {label}
      </span>
      <label className="dropzone">
        <input
          ref={inputRef}
          type="file"
          name={name}
          accept="application/pdf,.pdf,application/xml,text/xml,.xml,image/jpeg,image/png"
          multiple
          onChange={(e) => setNames(Array.from(e.target.files ?? []).map((f) => f.name))}
        />
        <Icon name="upload" size={32} />
        <strong>{names.length ? names.join(", ") : "Wybierz faktury lub upuść je tutaj"}</strong>
        <span className="hint">PDF lub XML z KSeF (także JPG, PNG) · do 10 MB na plik · maks. 12 plików</span>
      </label>
      {err(name)}
    </div>
  );

  return (
    <div className="wizard" ref={topRef} style={{ scrollMarginTop: 24 }}>
      {turnstileSiteKey && !loggedIn && <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer />}
      <ol className="progress-steps" style={{ gridTemplateColumns: `repeat(${STEPS.length}, minmax(0,1fr))` }} aria-label="Etapy zamówienia">
        {STEPS.map((s, i) => (
          <li key={s} data-state={i < step ? "done" : i === step ? "current" : "todo"} aria-current={i === step ? "step" : undefined}>
            {i < step ? (
              <button type="button" className="progress-steps__link" onClick={() => setStep(i)}>
                {s}
              </button>
            ) : (
              s
            )}
          </li>
        ))}
      </ol>
      <p className="muted small" style={{ marginBottom: 24 }}>
        Etap {step} z {STEPS.length - 1} · {STEPS[step]}
      </p>

      <form
        action={action}
        noValidate
        className="panel"
        style={{ padding: 32 }}
        onSubmit={() => {
          try {
            sessionStorage.removeItem(DRAFT_KEY);
          } catch {
            /* ignoruj */
          }
        }}
      >
        <div className="wizard__art" aria-hidden="true">
          <img src={STEP_ART[step]} alt="" width={1312} height={1199} />
        </div>
        {step !== 7 && state.error && (
          <div style={{ marginBottom: 16 }}>
            <FormAlert state={state} />
          </div>
        )}
        {c.id && <input type="hidden" name="companyId" value={c.id} />}
        <input type="hidden" name="points" value={pointsJson} />
        <input type="hidden" name="_t" value={startedAt || ""} />
        <div className="hp-field" aria-hidden="true">
          <label>
            Strona www
            <input type="text" name="website" tabIndex={-1} autoComplete="off" />
          </label>
        </div>

        {/* Etap 0 – dane firmy */}
        <section hidden={step !== 0} aria-labelledby="s0">
          <h2 id="s0">Dane Twojej firmy</h2>
          <p className="muted">
            Jedna rejestracja – wiele ofert od sprawdzonych dostawców. Podaj dane firmy i osoby kontaktowej. Adres e-mail będzie loginem do Portalu Klienta.
          </p>
          <div className="form" style={{ marginTop: 16 }}>
            <div className="form-row">
              {F("companyName", "Nazwa firmy", { autoComplete: "organization" })}
              {F("nip", "NIP firmy", { inputMode: "numeric", placeholder: "Wpisz 10 cyfr" })}
            </div>
            <div className="form-row">
              {F("regon", "REGON", { inputMode: "numeric", opt: true })}
              <div className="field">
                <label htmlFor="w-legalForm">Forma działalności</label>
                <select id="w-legalForm" className="select" name="legalForm" value={c.legalForm} onChange={(e) => setField("legalForm", e.target.value)}>
                  <option value="">Wybierz…</option>
                  {LEGAL_FORMS.map((f) => (
                    <option key={f}>{f}</option>
                  ))}
                </select>
              </div>
            </div>
            <h3 style={{ marginTop: 16, marginBottom: 0 }}>Osoba kontaktowa</h3>
            <div className="form-row form-row--3">
              {F("contactName", "Imię i nazwisko", { autoComplete: "name" })}
              {F("contactPhone", "Telefon", { type: "tel", autoComplete: "tel" })}
              {F("contactEmail", loggedIn ? "E-mail kontaktowy" : "E-mail (login do portalu)", { type: "email", autoComplete: "email" })}
            </div>
            {errors.login && (
              <div className="alert alert--warn">
                <Icon name="info" />
                <p>
                  Masz już konto? <Link href="/portal/logowanie/?next=/portal/wniosek/">Zaloguj się</Link> – wybrane opcje kreatora zostaną zachowane w tej
                  przeglądarce.
                </p>
              </div>
            )}
            <h3 style={{ marginTop: 16, marginBottom: 0 }}>Adres siedziby</h3>
            <div className="form-row form-row--3">
              {F("hqStreet", "Ulica i numer", { autoComplete: "address-line1" })}
              {F("hqPostalCode", "Kod pocztowy", { autoComplete: "postal-code", placeholder: "00-000" })}
              {F("hqCity", "Miejscowość", { autoComplete: "address-level2" })}
            </div>
            <label className="check">
              <input type="checkbox" name="corrDifferent" checked={c.corrDifferent} onChange={(e) => setField("corrDifferent", e.target.checked)} />
              <span>Adres korespondencyjny jest inny niż adres siedziby</span>
            </label>
            {c.corrDifferent && (
              <div className="form-row form-row--3">
                {F("corrStreet", "Ulica i numer")}
                {F("corrPostalCode", "Kod pocztowy", { placeholder: "00-000" })}
                {F("corrCity", "Miejscowość")}
              </div>
            )}
          </div>
        </section>

        {/* Etap 1 – media */}
        <section hidden={step !== 1} aria-labelledby="s1">
          <h2 id="s1">Wybierz media, dla których chcesz otrzymać ofertę</h2>
          <p className="muted">Prąd, gaz albo oba media – porównamy oferty sprawdzonych sprzedawców w jednym miejscu.</p>
          <div className="choice-grid" style={{ marginTop: 24 }}>
            {(Object.keys(MEDIA) as Media[]).map((m) => (
              <label className="choice" key={m}>
                <input type="radio" name="media" value={m} checked={media === m} onChange={() => setMedia(m)} {...inv("media")} />
                <span style={{ alignItems: "center", textAlign: "center", padding: "24px 16px" }}>
                  <span className="choice__icon" style={{ display: "flex", gap: 4 }}>
                    {m !== "GAZ" && <Icon name="bolt" size={30} />}
                    {m !== "PRAD" && <Icon name="flame" size={30} />}
                  </span>
                  {MEDIA[m]}
                </span>
              </label>
            ))}
          </div>
          {err("media")}
        </section>

        {/* Etap 2 – lata */}
        <section hidden={step !== 2} aria-labelledby="s2">
          <h2 id="s2">Na które lata chcesz zabezpieczyć zakup {media === "GAZ" ? "gazu" : media === "PRAD_GAZ" ? "prądu i gazu" : "energii"}?</h2>
          <p className="muted">Możesz wybrać jeden rok lub kilka kolejnych okresów, aby porównać dostępne ceny.</p>
          <div className="choice-grid" style={{ marginTop: 16 }}>
            {yearOptions.map((y) => (
              <label className="choice" key={y}>
                <input type="checkbox" name="years" value={y} checked={years.includes(y)} onChange={(e) => setYears((prev) => (e.target.checked ? [...prev, y] : prev.filter((x) => x !== y)))} />
                <span style={{ alignItems: "center", fontSize: 20 }}>{y}</span>
              </label>
            ))}
            <button type="button" className="btn btn--ghost" style={{ minHeight: 56, borderRadius: 14 }} onClick={() => setYears(years.length === yearOptions.length ? [] : yearOptions)}>
              <Icon name="checkCircle" size={18} /> {years.length === yearOptions.length ? "Odznacz" : "Wszystkie lata"}
            </button>
          </div>
          {err("years")}
        </section>

        {/* Etap 3 – warianty (wielokrotny wybór) */}
        <section hidden={step !== 3} aria-labelledby="s3">
          <h2 id="s3">{text("s3").title}</h2>
          <p className="muted" dangerouslySetInnerHTML={{ __html: text("s3").html }} />
          <div className="choice-grid choice-grid--wide" style={{ marginTop: 16 }}>
            {(media ? PRICE_OPTIONS[media] : []).map((m) => (
              <label className="choice" key={m}>
                <input
                  type="checkbox"
                  name="priceModels"
                  value={m}
                  checked={models.includes(m)}
                  onChange={(e) => setModels((prev) => (e.target.checked ? [...prev, m] : prev.filter((x) => x !== m)))}
                />
                <span>
                  <Icon name={MODEL_ICON[m]} className="choice__icon" />
                  {priceLabel(m, media, PRICE_MODELS[m].label)}
                  <small>{PRICE_MODELS[m].help}</small>
                </span>
              </label>
            ))}
          </div>
          {err("priceModels")}
        </section>

        {/* Etap 4 – taryfa i zużycie */}
        <section hidden={step !== 4} aria-labelledby="s4">
          <h2 id="s4">{text("s4").title}</h2>
          <p className="muted" dangerouslySetInnerHTML={{ __html: text("s4").html }} />
          {withPower && (
            <div className="sub-panel" style={{ marginTop: 16 }}>
              <h3 style={{ marginTop: 0 }}>
                <Icon name="bolt" size={20} /> Prąd
              </h3>
              <div className="field">
                <span className="label">Grupa taryfowa</span>
                <div className="choice-grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(96px, 1fr))" }}>
                  {TARIFFS_POWER.map((t) => (
                    <label className="choice" key={t}>
                      <input type="radio" name="tariff" value={t} checked={tariff === t} onChange={() => setTariff(t)} />
                      <span style={{ alignItems: "center", minHeight: 48, padding: 10, textAlign: "center" }}>{t}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="field" style={{ marginTop: 16, maxWidth: 420 }}>
                <label htmlFor="usage">
                  Roczne zużycie energii <span className="opt">(MWh, opcjonalnie)</span>
                </label>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <input id="usage" className="input" name="annualUsageMWh" inputMode="decimal" placeholder="np. 450" value={usage} onChange={(e) => setUsage(e.target.value)} {...inv("annualUsageMWh")} />
                  <strong>MWh</strong>
                </div>
                <span className="hint">1 MWh = 1000 kWh. Na fakturze zużycie bywa podane w kWh.</span>
                {err("annualUsageMWh")}
              </div>
              <div className="btn-row" style={{ marginTop: 8 }}>
                {USAGE_RANGES.map((r) => (
                  <button key={r.key} type="button" className="btn btn--ghost btn--sm" onClick={() => setUsage(String(r.value))}>
                    {r.label}
                  </button>
                ))}
              </div>
            </div>
          )}
          {withGas && (
            <div className="sub-panel" style={{ marginTop: 16 }}>
              <h3 style={{ marginTop: 0 }}>
                <Icon name="flame" size={20} /> Gaz
              </h3>
              <div className="field">
                <span className="label">Grupa taryfowa gazu</span>
                <div className="choice-grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(96px, 1fr))" }}>
                  {TARIFFS_GAS.map((t) => (
                    <label className="choice" key={t}>
                      <input type="radio" name="tariffGas" value={t} checked={tariffGas === t} onChange={() => setTariffGas(t)} />
                      <span style={{ alignItems: "center", minHeight: 48, padding: 10, textAlign: "center" }}>{t}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="field" style={{ marginTop: 16, maxWidth: 420 }}>
                <label htmlFor="usageGas">
                  Roczne zużycie gazu <span className="opt">(MWh, opcjonalnie)</span>
                </label>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <input id="usageGas" className="input" name="annualUsageGasMWh" inputMode="decimal" placeholder="np. 120" value={usageGas} onChange={(e) => setUsageGas(e.target.value)} {...inv("annualUsageGasMWh")} />
                  <strong>MWh</strong>
                </div>
                <span className="hint">Zużycie gazu na fakturze bywa podane w m³ i kWh – wpisz wartość w MWh (kWh ÷ 1000).</span>
                {err("annualUsageGasMWh")}
              </div>
            </div>
          )}
        </section>

        {/* Etap 5 – faktury osobno dla prądu i gazu */}
        <section hidden={step !== 5} aria-labelledby="s5">
          <h2 id="s5">{text("s5").title}</h2>
          <p className="muted" dangerouslySetInnerHTML={{ __html: text("s5").html }} />
          <div className="stack" style={{ marginTop: 16, gap: 16 }}>
            {withPower && invoiceDrop({ name: "invoicePower", label: "Faktury za prąd", names: invPower, setNames: setInvPower, inputRef: powerRef, icon: "bolt" })}
            {withGas && invoiceDrop({ name: "invoiceGas", label: "Faktury za gaz", names: invGas, setNames: setInvGas, inputRef: gasRef, icon: "flame" })}
          </div>
          <div className="alert" style={{ marginTop: 24 }}>
            <Icon name="info" />
            <p>Nie masz faktur pod ręką? Przejdź dalej – dokumenty dodasz później w Portalu Klienta, a doradca pomoże uzupełnić dane.</p>
          </div>
        </section>

        {/* Etap 6 – liczniki */}
        <section hidden={step !== 6} aria-labelledby="s6">
          <h2 id="s6">{text("s6").title}</h2>
          <p className="muted" dangerouslySetInnerHTML={{ __html: text("s6").html }} />
          <div className="btn-row" style={{ marginTop: 16 }}>
            <button type="button" className="btn" onClick={readInvoices} disabled={reading}>
              <Icon name="file" size={18} /> {reading ? "Odczytuję faktury…" : "Wczytaj dane z faktury"}
            </button>
            <button
              type="button"
              className={`btn ${pointsMode === "edit" ? "btn--secondary" : "btn--ghost"}`}
              onClick={() => {
                setPointsMode("edit");
                if (!points.length) setPoints([emptyPoint(media === "GAZ" ? "GAZ" : "PRAD")]);
              }}
            >
              <Icon name="settings" size={18} /> Wpisz ręcznie
            </button>
            <button
              type="button"
              className="btn btn--ghost"
              onClick={() => {
                setPointsMode("skip");
                setStep(7);
              }}
            >
              Pomiń krok <Icon name="arrowRight" size={18} />
            </button>
          </div>
          {readMsg && (
            <div className={`alert ${readMsg.ok ? "alert--ok" : "alert--warn"}`} style={{ marginTop: 16 }} role="status">
              <Icon name={readMsg.ok ? "checkCircle" : "info"} />
              <p>{readMsg.text}</p>
            </div>
          )}
          {err("points")}
          {pointsMode === "edit" && (
            <div style={{ marginTop: 24 }}>
              <PointsEditor points={points} setPoint={setPoint} setPoints={setPoints} media={media} errors={errors} />
            </div>
          )}
          {pointsMode === "skip" && <p className="muted small">Dane liczników uzupełnisz później w zakładce „Liczniki i umowy”.</p>}
        </section>

        {/* Etap 7 – finalizacja */}
        <section hidden={step !== 7} aria-labelledby="s7">
          <h2 id="s7">{loggedIn ? "Sprawdź dane i wygeneruj ofertę" : "Sprawdź dane, zarejestruj profil i wygeneruj ofertę"}</h2>
          <p className="muted" dangerouslySetInnerHTML={{ __html: STEP7_HTML }} />
          <dl className="dl" style={{ marginTop: 16 }}>
            <dt>Firma</dt>
            <dd>
              {c.companyName || "–"} {c.nip && `(NIP ${c.nip})`}{" "}
              <button type="button" className="link-btn" onClick={() => setStep(0)}>
                zmień
              </button>
            </dd>
            <dt>Media</dt>
            <dd>{media ? MEDIA[media] : "–"}</dd>
            <dt>Lata zakupu</dt>
            <dd>{[...years].sort().join(", ") || "–"}</dd>
            <dt>Warianty</dt>
            <dd>{models.map((m) => priceLabel(m, media, PRICE_MODELS[m].label)).join(" · ") || "–"}</dd>
            {withPower && (
              <>
                <dt>Prąd: taryfa / zużycie</dt>
                <dd>
                  {tariff || "–"} / {usage ? `${usage} MWh` : "–"}
                </dd>
              </>
            )}
            {withGas && (
              <>
                <dt>Gaz: taryfa / zużycie</dt>
                <dd>
                  {tariffGas || "–"} / {usageGas ? `${usageGas} MWh` : "–"}
                </dd>
              </>
            )}
            <dt>Faktury</dt>
            <dd>{[...invPower, ...invGas].join(", ") || "brak – dodasz je później"}</dd>
            <dt>Liczniki</dt>
            <dd>{pointsMode === "edit" ? points.filter((p) => p.ppeNumber || p.street || p.meterNumber).length || "–" : "uzupełnisz później"}</dd>
          </dl>
          <div className="field" style={{ marginTop: 24 }}>
            <label htmlFor="comment">
              Uwagi dla doradcy <span className="opt">(opcjonalnie)</span>
            </label>
            <textarea id="comment" className="textarea" name="comment" rows={3} placeholder="Np. termin zakończenia obecnej umowy, plany rozbudowy, preferowane godziny kontaktu" />
          </div>
          <label className="check" style={{ marginTop: 12 }}>
            <input type="checkbox" name="wantsCall" />
            <span>
              <strong>Kontakt z ekspertem</strong> – zadzwonimy, aby omówić oferty.
            </span>
          </label>

          {!loggedIn && (
            <div className="sub-panel" style={{ marginTop: 24 }}>
              <h3 style={{ marginTop: 0 }}>Załóż darmowe konto</h3>
              <p className="small muted" style={{ marginTop: 0 }}>
                Login: <strong>{c.contactEmail || "adres e-mail z etapu 0"}</strong>. Po rejestracji otrzymasz:
              </p>
              <ul className="checklist small" style={{ marginBottom: 16 }}>
                {STEP7_BENEFITS.map((b) => (
                  <li key={b}>{b}</li>
                ))}
              </ul>
              <div className="form-row">
                <div className="field">
                  <label htmlFor="password">Hasło</label>
                  <input id="password" className="input" type="password" name="password" autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} {...inv("password")} />
                  <span className="hint">Minimum 10 znaków, w tym litera i cyfra.</span>
                  {err("password")}
                </div>
                <div className="field">
                  <label htmlFor="password2">Powtórz hasło</label>
                  <input id="password2" className="input" type="password" name="password2" autoComplete="new-password" {...inv("password2")} />
                  {err("password2")}
                </div>
              </div>
              <fieldset className="fieldset" style={{ marginTop: 16 }}>
                <legend className="label">Zgody</legend>
                <label className="check">
                  <input type="checkbox" name="terms" {...inv("terms")} />
                  <span>
                    Akceptuję <Link href="/regulamin/" target="_blank">Regulamin</Link> i zapoznałem/-am się z{" "}
                    <Link href="/polityka-prywatnosci/" target="_blank">Polityką prywatności (RODO)</Link>. <span className="req">(wymagane)</span>
                  </span>
                </label>
                {err("terms")}
                <label className="check">
                  <input type="checkbox" name="marketingEmail" />
                  <span>Chcę otrzymywać informacje handlowe i oferty e-mailem. (opcjonalnie)</span>
                </label>
                <label className="check">
                  <input type="checkbox" name="sms" />
                  <span>Chcę otrzymywać powiadomienia i informacje handlowe SMS-em. (opcjonalnie)</span>
                </label>
                <label className="check">
                  <input type="checkbox" name="newsletter" />
                  <span>Zapisz mnie do newslettera z informacjami z rynku energii, promocjami i nowościami dla firm. (opcjonalnie)</span>
                </label>
                <p className="hint" style={{ margin: 0 }}>
                  Zgody opcjonalne możesz w każdej chwili zmienić lub wycofać w ustawieniach konta.
                </p>
              </fieldset>
              {turnstileSiteKey && <div className="cf-turnstile" data-sitekey={turnstileSiteKey} data-language="pl" style={{ marginTop: 16 }} />}
              {err("captcha")}
            </div>
          )}

          <div className="alert" style={{ marginTop: 24 }}>
            <Icon name="info" />
            <p>Złożenie zamówienia nie oznacza zawarcia umowy. Po wygenerowaniu ofert wybierzesz propozycję, a umowę podpiszesz w kolejnym kroku.</p>
          </div>
          <div style={{ marginTop: 16 }}>
            <FormAlert state={state} />
          </div>
        </section>

        <div className="wizard__nav">
          {step > 0 && !(step === 1 && c.id) ? (
            <button type="button" className="btn btn--ghost" onClick={() => setStep((s) => s - 1)}>
              <Icon name="arrowLeft" size={18} /> Wstecz
            </button>
          ) : (
            <Link className="btn btn--ghost" href={loggedIn ? "/portal/" : "/"}>
              Anuluj
            </Link>
          )}
          {step < STEPS.length - 1 ? (
            <button type="button" className="btn" onClick={next}>
              Dalej <Icon name="arrowRight" size={18} className="arrow" />
            </button>
          ) : (
            <SubmitButton className="btn btn--lg" pending="Generujemy oferty…">
              {loggedIn ? "Wygeneruj ofertę" : "Zarejestruj profil i wygeneruj ofertę"}
            </SubmitButton>
          )}
        </div>
      </form>
    </div>
  );
}
