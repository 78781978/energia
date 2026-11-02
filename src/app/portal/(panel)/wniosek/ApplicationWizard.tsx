"use client";

import Link from "next/link";
import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { submitApplication } from "@/app/actions/portal";
import { trackFunnel } from "@/app/actions/public";
import { initialFormState } from "@/lib/forms";
import { FormAlert, SubmitButton } from "@/components/forms";
import { Icon, type IconName } from "@/components/Icon";
import { LEGAL_FORMS, MEDIA, PRICE_MODELS, TARIFFS_GAS, TARIFFS_POWER, USAGE_RANGES, type Media, type PriceModel } from "@/lib/constants";
import { isPlausiblePpe, isValidEmail, isValidNip, isValidPhone, isValidPostalCode, isValidRegon } from "@/lib/validators";

export type CompanyDraft = {
  id?: string;
  companyName: string;
  nip: string;
  regon: string;
  legalForm: string;
  contactName: string;
  contactPhone: string;
  contactEmail: string;
  hqStreet: string;
  hqPostalCode: string;
  hqCity: string;
  corrDifferent: boolean;
  corrStreet: string;
  corrPostalCode: string;
  corrCity: string;
};

export type PointDraft = {
  key: string;
  id?: string;
  medium: "PRAD" | "GAZ";
  ppeNumber: string;
  street: string;
  postalCode: string;
  city: string;
  currentSeller: string;
  operator: string;
  tariff: string;
  annualUsageMWh: string;
  contractedPowerKw: string;
  contractEndDate: string;
};

const STEPS = ["Media", "Lata zakupu", "Model ceny", "Taryfa i zużycie", "Faktura", "Firma i punkty poboru", "Podsumowanie"];
// Do którego kroku należy pole zwrócone przez serwer
const FIELD_STEP: Record<string, number> = { media: 0, years: 1, priceModel: 2, tariff: 3, annualUsageMWh: 3, invoice: 4 };

const MODEL_ICON: Record<PriceModel, IconName> = { STALA: "shield", RDN: "chart", TRANSZE: "piggy", OZE: "leaf", INDYWIDUALNA: "search" };

let keySeq = 0;
export const emptyPoint = (medium: "PRAD" | "GAZ" = "PRAD", key?: string): PointDraft => ({
  key: key ?? `p${Date.now()}${keySeq++}`,
  medium,
  ppeNumber: "",
  street: "",
  postalCode: "",
  city: "",
  currentSeller: "",
  operator: "",
  tariff: "",
  annualUsageMWh: "",
  contractedPowerKw: "",
  contractEndDate: "",
});

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

export function ApplicationWizard({ company, points: initialPoints, years: yearOptions, isNew }: { company: CompanyDraft; points: PointDraft[]; years: number[]; isNew: boolean }) {
  const [state, action] = useActionState(submitApplication, initialFormState);
  const [step, setStep] = useState(0);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [media, setMedia] = useState<Media | "">("");
  const [years, setYears] = useState<number[]>([]);
  const [model, setModel] = useState<PriceModel | "">("");
  const [tariff, setTariff] = useState("");
  const [usage, setUsage] = useState("");
  const [invoiceNames, setInvoiceNames] = useState<string[]>([]);
  const [poaName, setPoaName] = useState<string | null>(null);
  const [c, setC] = useState<CompanyDraft>(company);
  const [points, setPoints] = useState<PointDraft[]>(initialPoints.length ? initialPoints : [emptyPoint("PRAD", "nowy-punkt")]);
  const topRef = useRef<HTMLDivElement>(null);

  // Błędy z serwera: pokaż i przejdź do pierwszego kroku z błędem
  useEffect(() => {
    if (state.error) {
      // Po odpowiedzi serwera przeglądarka czyści pola plików – trzeba je dodać ponownie.
      setInvoiceNames([]);
      setPoaName(null);
    }
    if (!state.fieldErrors) return;
    setErrors(state.fieldErrors);
    const steps = Object.keys(state.fieldErrors).map((k) => FIELD_STEP[k] ?? 5);
    setStep(Math.min(...steps));
  }, [state]);

  useEffect(() => {
    trackFunnel(visitorId(), step + 1).catch(() => undefined);
    topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [step]);

  const tariffs = media === "GAZ" ? TARIFFS_GAS : TARIFFS_POWER;
  const setField = (k: keyof CompanyDraft, v: string | boolean) => setC((prev) => ({ ...prev, [k]: v }));
  const setPoint = (key: string, k: keyof PointDraft, v: string) => setPoints((prev) => prev.map((p) => (p.key === key ? { ...p, [k]: v } : p)));

  function validate(s: number): Record<string, string> {
    const e: Record<string, string> = {};
    if (s === 0 && !media) e.media = "Wybierz media, dla których chcesz otrzymać ofertę.";
    if (s === 1 && !years.length) e.years = "Wybierz co najmniej jeden rok.";
    if (s === 2 && !model) e.priceModel = "Wybierz wariant zakupu.";
    if (s === 3 && usage && !(Number(usage.replace(",", ".")) >= 0)) e.annualUsageMWh = "Wpisz liczbę, np. 120.";
    if (s === 5) {
      if (c.companyName.trim().length < 2) e.companyName = "Podaj nazwę firmy.";
      if (!isValidNip(c.nip)) e.nip = "Wpisz poprawny NIP (10 cyfr).";
      if (c.regon && !isValidRegon(c.regon)) e.regon = "Wpisz poprawny REGON (9 lub 14 cyfr).";
      if (!c.contactName.trim()) e.contactName = "Podaj osobę kontaktową.";
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
      points.forEach((p, i) => {
        if (p.ppeNumber && !isPlausiblePpe(p.ppeNumber)) e[`point_${i}_ppeNumber`] = "Numer PPE wygląda na niepoprawny – sprawdź go na fakturze.";
        if (p.postalCode && !isValidPostalCode(p.postalCode)) e[`point_${i}_postalCode`] = "Format: 00-000.";
      });
      if (!invoiceNames.length && !points.some((p) => p.ppeNumber.trim()))
        e.points = "Dodaj co najmniej jeden punkt poboru z numerem PPE albo wróć do kroku 5 i prześlij fakturę.";
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

  const err = (k: string) =>
    errors[k] ? (
      <span className="error-text" id={`${k}-err`} role="alert">
        <Icon name="alert" size={16} /> {errors[k]}
      </span>
    ) : null;
  const inv = (k: string) => (errors[k] ? { "aria-invalid": true as const, "aria-describedby": `${k}-err` } : {});

  const pointsJson = useMemo(() => JSON.stringify(points.map(({ key: _k, ...p }) => p)), [points]);

  return (
    <div className="wizard" ref={topRef} style={{ scrollMarginTop: 24 }}>
      {isNew && step === 0 && (
        <div className="alert alert--ok" style={{ marginBottom: 24 }}>
          <Icon name="checkCircle" />
          <p>
            <strong>Konto zostało utworzone.</strong>
            Wypełnij wniosek – zajmie to kilka minut. Jeśli nie znasz wszystkich danych, wystarczy faktura.
          </p>
        </div>
      )}
      <ol className="progress-steps" style={{ gridTemplateColumns: `repeat(${STEPS.length}, minmax(0,1fr))` }} aria-label="Kroki wniosku">
        {STEPS.map((s, i) => (
          <li key={s} data-state={i < step ? "done" : i === step ? "current" : "todo"} aria-current={i === step ? "step" : undefined}>
            {s}
          </li>
        ))}
      </ol>
      <p className="muted small" style={{ marginBottom: 24 }}>
        Krok {step + 1} z {STEPS.length}
      </p>

      <form action={action} noValidate className="panel" style={{ padding: 32 }}>
        {c.id && <input type="hidden" name="companyId" value={c.id} />}
        <input type="hidden" name="points" value={pointsJson} />

        {/* 1. Media */}
        <section hidden={step !== 0} aria-labelledby="s1">
          <h2 id="s1">Wybierz media, dla których chcesz otrzymać ofertę</h2>
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

        {/* 2. Lata */}
        <section hidden={step !== 1} aria-labelledby="s2">
          <h2 id="s2">Na które lata chcesz zabezpieczyć zakup energii?</h2>
          <p className="muted">Możesz wybrać jeden rok lub kilka kolejnych okresów, aby porównać dostępne ceny.</p>
          <div className="choice-grid" style={{ marginTop: 16 }}>
            {yearOptions.map((y) => (
              <label className="choice" key={y}>
                <input
                  type="checkbox"
                  name="years"
                  value={y}
                  checked={years.includes(y)}
                  onChange={(e) => setYears((prev) => (e.target.checked ? [...prev, y] : prev.filter((x) => x !== y)))}
                />
                <span style={{ alignItems: "center", fontSize: 20 }}>{y}</span>
              </label>
            ))}
            <button
              type="button"
              className="btn btn--ghost"
              style={{ minHeight: 56, borderRadius: 14 }}
              onClick={() => setYears(years.length === yearOptions.length ? [] : yearOptions)}
            >
              <Icon name="checkCircle" size={18} /> {years.length === yearOptions.length ? "Odznacz" : "Wszystkie lata"}
            </button>
          </div>
          {err("years")}
        </section>

        {/* 3. Model */}
        <section hidden={step !== 2} aria-labelledby="s3">
          <h2 id="s3">Wybierz wariant zakupu (model ceny)</h2>
          <p className="muted">Nie wiesz, który wybrać? Zaznacz „Wycena indywidualna” – doradca zaproponuje model po analizie danych.</p>
          <div className="choice-grid choice-grid--wide" style={{ marginTop: 16 }}>
            {(Object.keys(PRICE_MODELS) as PriceModel[]).map((m) => (
              <label className="choice" key={m}>
                <input type="radio" name="priceModel" value={m} checked={model === m} onChange={() => setModel(m)} />
                <span>
                  <Icon name={MODEL_ICON[m]} className="choice__icon" />
                  {PRICE_MODELS[m].label}
                  <small>{PRICE_MODELS[m].help}</small>
                </span>
              </label>
            ))}
          </div>
          {err("priceModel")}
        </section>

        {/* 4. Taryfa i zużycie */}
        <section hidden={step !== 3} aria-labelledby="s4">
          <h2 id="s4">Podaj taryfę oraz szacowane roczne zużycie</h2>
          <p className="muted">Dane znajdziesz na fakturze. Jeśli ich nie znasz, przejdź dalej i prześlij fakturę w kolejnym kroku.</p>
          <div className="field" style={{ marginTop: 16 }}>
            <span className="label">Grupa taryfowa {media === "PRAD_GAZ" && <span className="opt">(prąd – taryfy gazowe podasz przy punktach poboru)</span>}</span>
            <div className="choice-grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(96px, 1fr))" }}>
              {tariffs.map((t) => (
                <label className="choice" key={t}>
                  <input type="radio" name="tariff" value={t} checked={tariff === t} onChange={() => setTariff(t)} />
                  <span style={{ alignItems: "center", minHeight: 48, padding: 10, textAlign: "center" }}>{t}</span>
                </label>
              ))}
            </div>
          </div>
          <div className="field" style={{ marginTop: 24, maxWidth: 420 }}>
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
          <div className="btn-row" style={{ marginTop: 12 }}>
            {USAGE_RANGES.map((r) => (
              <button key={r.key} type="button" className="btn btn--ghost btn--sm" onClick={() => setUsage(String(r.value))}>
                {r.label}
              </button>
            ))}
          </div>
        </section>

        {/* 5. Faktura */}
        <section hidden={step !== 4} aria-labelledby="s5">
          <h2 id="s5">Wczytaj fakturę (PDF)</h2>
          <p className="muted">
            Faktura od obecnego sprzedawcy pozwoli przygotować ofertę dopasowaną do Twojej firmy. Faktury z 12 miesięcy umożliwią dokładniejszą analizę
            kosztów.
          </p>
          <label className="dropzone" style={{ marginTop: 16 }}>
            <input type="file" name="invoice" accept="application/pdf,image/jpeg,image/png" multiple onChange={(e) => setInvoiceNames(Array.from(e.target.files ?? []).map((f) => f.name))} />
            <Icon name="upload" size={32} />
            <strong>{invoiceNames.length ? invoiceNames.join(", ") : "Wybierz faktury lub upuść je tutaj"}</strong>
            <span className="hint">PDF, JPG lub PNG · do 10 MB na plik · maks. 5 plików</span>
          </label>
          {err("invoice")}
          <div className="field" style={{ marginTop: 24 }}>
            <span className="label">
              Pełnomocnictwo <span className="opt">(opcjonalnie – jeśli już je masz)</span>
            </span>
            <label className="dropzone" style={{ padding: 20 }}>
              <input type="file" name="poa" accept="application/pdf,image/jpeg,image/png" onChange={(e) => setPoaName(e.target.files?.[0]?.name ?? null)} />
              <strong>{poaName ?? "Dodaj pełnomocnictwo"}</strong>
            </label>
          </div>
          <div className="alert" style={{ marginTop: 24 }}>
            <Icon name="info" />
            <p>Nie masz faktury pod ręką? Przejdź dalej i uzupełnij dane punktu poboru ręcznie. Dokumenty możesz dodać także później w panelu.</p>
          </div>
        </section>

        {/* 6. Firma i PPE */}
        <section hidden={step !== 5} aria-labelledby="s6">
          <h2 id="s6">Dane firmy</h2>
          <div className="form" style={{ marginTop: 16 }}>
            <div className="form-row">
              <div className="field">
                <label htmlFor="companyName">Nazwa firmy</label>
                <input id="companyName" className="input" name="companyName" autoComplete="organization" value={c.companyName} onChange={(e) => setField("companyName", e.target.value)} {...inv("companyName")} />
                {err("companyName")}
              </div>
              <div className="field">
                <label htmlFor="nip">NIP firmy</label>
                <input id="nip" className="input" name="nip" inputMode="numeric" placeholder="Wpisz 10 cyfr" value={c.nip} onChange={(e) => setField("nip", e.target.value)} {...inv("nip")} />
                {err("nip")}
              </div>
            </div>
            <div className="form-row">
              <div className="field">
                <label htmlFor="regon">
                  REGON <span className="opt">(opcjonalnie)</span>
                </label>
                <input id="regon" className="input" name="regon" inputMode="numeric" value={c.regon} onChange={(e) => setField("regon", e.target.value)} {...inv("regon")} />
                {err("regon")}
              </div>
              <div className="field">
                <label htmlFor="legalForm">Forma działalności</label>
                <select id="legalForm" className="select" name="legalForm" value={c.legalForm} onChange={(e) => setField("legalForm", e.target.value)}>
                  <option value="">Wybierz…</option>
                  {LEGAL_FORMS.map((f) => (
                    <option key={f}>{f}</option>
                  ))}
                </select>
              </div>
            </div>

            <h3 style={{ marginTop: 16, marginBottom: 0 }}>Osoba kontaktowa</h3>
            <div className="form-row--3 form-row">
              <div className="field">
                <label htmlFor="contactName">Imię i nazwisko</label>
                <input id="contactName" className="input" name="contactName" autoComplete="name" value={c.contactName} onChange={(e) => setField("contactName", e.target.value)} {...inv("contactName")} />
                {err("contactName")}
              </div>
              <div className="field">
                <label htmlFor="contactPhone">Telefon</label>
                <input id="contactPhone" className="input" type="tel" name="contactPhone" autoComplete="tel" value={c.contactPhone} onChange={(e) => setField("contactPhone", e.target.value)} {...inv("contactPhone")} />
                {err("contactPhone")}
              </div>
              <div className="field">
                <label htmlFor="contactEmail">E-mail</label>
                <input id="contactEmail" className="input" type="email" name="contactEmail" autoComplete="email" value={c.contactEmail} onChange={(e) => setField("contactEmail", e.target.value)} {...inv("contactEmail")} />
                {err("contactEmail")}
              </div>
            </div>

            <h3 style={{ marginTop: 16, marginBottom: 0 }}>Adres siedziby</h3>
            <div className="form-row form-row--3">
              <div className="field">
                <label htmlFor="hqStreet">Ulica i numer</label>
                <input id="hqStreet" className="input" name="hqStreet" autoComplete="address-line1" value={c.hqStreet} onChange={(e) => setField("hqStreet", e.target.value)} {...inv("hqStreet")} />
                {err("hqStreet")}
              </div>
              <div className="field">
                <label htmlFor="hqPostalCode">Kod pocztowy</label>
                <input id="hqPostalCode" className="input" name="hqPostalCode" autoComplete="postal-code" placeholder="00-000" value={c.hqPostalCode} onChange={(e) => setField("hqPostalCode", e.target.value)} {...inv("hqPostalCode")} />
                {err("hqPostalCode")}
              </div>
              <div className="field">
                <label htmlFor="hqCity">Miejscowość</label>
                <input id="hqCity" className="input" name="hqCity" autoComplete="address-level2" value={c.hqCity} onChange={(e) => setField("hqCity", e.target.value)} {...inv("hqCity")} />
                {err("hqCity")}
              </div>
            </div>
            <label className="check">
              <input type="checkbox" name="corrDifferent" checked={c.corrDifferent} onChange={(e) => setField("corrDifferent", e.target.checked)} />
              <span>Adres korespondencyjny jest inny niż adres siedziby</span>
            </label>
            {c.corrDifferent && (
              <div className="form-row form-row--3">
                <div className="field">
                  <label htmlFor="corrStreet">Ulica i numer</label>
                  <input id="corrStreet" className="input" name="corrStreet" value={c.corrStreet} onChange={(e) => setField("corrStreet", e.target.value)} {...inv("corrStreet")} />
                  {err("corrStreet")}
                </div>
                <div className="field">
                  <label htmlFor="corrPostalCode">Kod pocztowy</label>
                  <input id="corrPostalCode" className="input" name="corrPostalCode" placeholder="00-000" value={c.corrPostalCode} onChange={(e) => setField("corrPostalCode", e.target.value)} {...inv("corrPostalCode")} />
                  {err("corrPostalCode")}
                </div>
                <div className="field">
                  <label htmlFor="corrCity">Miejscowość</label>
                  <input id="corrCity" className="input" name="corrCity" value={c.corrCity} onChange={(e) => setField("corrCity", e.target.value)} {...inv("corrCity")} />
                  {err("corrCity")}
                </div>
              </div>
            )}

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "end", gap: 16, flexWrap: "wrap", marginTop: 24 }}>
              <div>
                <h2 style={{ margin: 0 }}>Punkty poboru</h2>
                <p className="muted small" style={{ margin: "4px 0 0" }}>
                  Każdy licznik (PPE) to osobny punkt. Dane znajdziesz na fakturze{invoiceNames.length ? " – skoro ją przesłałeś, pola są opcjonalne" : ""}.
                </p>
              </div>
            </div>
            {err("points")}
            <PointsEditor points={points} setPoint={setPoint} setPoints={setPoints} media={media} errors={errors} />
          </div>
        </section>

        {/* 7. Podsumowanie */}
        <section hidden={step !== 6} aria-labelledby="s7">
          <h2 id="s7">Sprawdź i wyślij wniosek</h2>
          <dl className="dl" style={{ marginTop: 16 }}>
            <dt>Media</dt>
            <dd>{media ? MEDIA[media] : "–"}</dd>
            <dt>Lata zakupu</dt>
            <dd>{years.sort().join(", ") || "–"}</dd>
            <dt>Model ceny</dt>
            <dd>{model ? PRICE_MODELS[model].label : "–"}</dd>
            <dt>Taryfa / zużycie</dt>
            <dd>
              {tariff || "–"} / {usage ? `${usage} MWh` : "–"}
            </dd>
            <dt>Dokumenty</dt>
            <dd>{[...invoiceNames, poaName].filter(Boolean).join(", ") || "brak"}</dd>
            <dt>Firma</dt>
            <dd>
              {c.companyName} (NIP {c.nip})
            </dd>
            <dt>Punkty poboru</dt>
            <dd>{points.filter((p) => p.ppeNumber || p.street).length || "uzupełnimy z faktury"}</dd>
          </dl>
          <div className="field" style={{ marginTop: 24 }}>
            <label htmlFor="comment">
              Uwagi dla doradcy <span className="opt">(opcjonalnie)</span>
            </label>
            <textarea id="comment" className="textarea" name="comment" rows={4} placeholder="Np. termin zakończenia obecnej umowy, plany rozbudowy, preferowane godziny kontaktu" />
          </div>
          <label className="check" style={{ marginTop: 16 }}>
            <input type="checkbox" name="wantsCall" />
            <span>
              <strong>Zamów rozmowę z doradcą</strong> – zadzwonimy przed przygotowaniem ofert.
            </span>
          </label>
          <div className="alert" style={{ marginTop: 24 }}>
            <Icon name="info" />
            <p>
              Wysłanie wniosku nie oznacza zawarcia umowy. Po przygotowaniu ofert wybierzesz propozycję, a umowę podpiszesz w kolejnym kroku. Finalizacja
              umowy zależy od procedur sprzedawcy energii.
            </p>
          </div>
          <div style={{ marginTop: 16 }}>
            <FormAlert state={state} />
          </div>
        </section>

        <div className="wizard__nav">
          {step > 0 ? (
            <button type="button" className="btn btn--ghost" onClick={() => setStep((s) => s - 1)}>
              <Icon name="arrowLeft" size={18} /> Wstecz
            </button>
          ) : (
            <Link className="btn btn--ghost" href="/portal/">
              Anuluj
            </Link>
          )}
          {step < STEPS.length - 1 ? (
            <button type="button" className="btn" onClick={next}>
              Dalej <Icon name="arrowRight" size={18} className="arrow" />
            </button>
          ) : (
            <SubmitButton className="btn btn--lg" pending="Wysyłanie wniosku…">
              Wyślij wniosek
            </SubmitButton>
          )}
        </div>
      </form>
    </div>
  );
}

export function PointsEditor({
  points,
  setPoint,
  setPoints,
  media,
  errors,
}: {
  points: PointDraft[];
  setPoint: (key: string, k: keyof PointDraft, v: string) => void;
  setPoints: React.Dispatch<React.SetStateAction<PointDraft[]>>;
  media: Media | "";
  errors: Record<string, string>;
}) {
  return (
    <div className="stack" style={{ gap: 16 }}>
      {points.map((p, i) => {
        const e = (k: string) => errors[`point_${i}_${k}`];
        const tariffs = p.medium === "GAZ" ? TARIFFS_GAS : TARIFFS_POWER;
        return (
          <fieldset key={p.key} className="ppe-card">
            <div className="ppe-card__head">
              <legend style={{ fontWeight: 700 }}>
                Punkt poboru {i + 1} {p.id && <span className="badge badge--plain">zapisany</span>}
              </legend>
              {points.length > 1 && (
                <button type="button" className="btn btn--ghost btn--sm" onClick={() => setPoints((prev) => prev.filter((x) => x.key !== p.key))}>
                  <Icon name="trash" size={16} /> Usuń
                </button>
              )}
            </div>
            <div className="form-row">
              <div className="field">
                <label htmlFor={`${p.key}-medium`}>Rodzaj</label>
                <select id={`${p.key}-medium`} className="select" value={p.medium} onChange={(ev) => setPoint(p.key, "medium", ev.target.value)}>
                  <option value="PRAD">Energia elektryczna</option>
                  <option value="GAZ">Gaz</option>
                </select>
              </div>
              <div className="field">
                <label htmlFor={`${p.key}-ppe`}>Numer PPE</label>
                <input
                  id={`${p.key}-ppe`}
                  className="input"
                  placeholder="Znajdziesz go na fakturze"
                  value={p.ppeNumber}
                  onChange={(ev) => setPoint(p.key, "ppeNumber", ev.target.value)}
                  aria-invalid={e("ppeNumber") ? true : undefined}
                />
                {e("ppeNumber") && <span className="error-text">{e("ppeNumber")}</span>}
              </div>
            </div>
            <div className="form-row form-row--3">
              <div className="field">
                <label htmlFor={`${p.key}-street`}>Adres punktu poboru</label>
                <input id={`${p.key}-street`} className="input" placeholder="Ulica i numer" value={p.street} onChange={(ev) => setPoint(p.key, "street", ev.target.value)} />
              </div>
              <div className="field">
                <label htmlFor={`${p.key}-postal`}>Kod pocztowy</label>
                <input
                  id={`${p.key}-postal`}
                  className="input"
                  placeholder="00-000"
                  value={p.postalCode}
                  onChange={(ev) => setPoint(p.key, "postalCode", ev.target.value)}
                  aria-invalid={e("postalCode") ? true : undefined}
                />
                {e("postalCode") && <span className="error-text">{e("postalCode")}</span>}
              </div>
              <div className="field">
                <label htmlFor={`${p.key}-city`}>Miejscowość</label>
                <input id={`${p.key}-city`} className="input" value={p.city} onChange={(ev) => setPoint(p.key, "city", ev.target.value)} />
              </div>
            </div>
            <div className="form-row">
              <div className="field">
                <label htmlFor={`${p.key}-seller`}>Obecny sprzedawca</label>
                <input id={`${p.key}-seller`} className="input" placeholder="np. nazwa sprzedawcy z faktury" value={p.currentSeller} onChange={(ev) => setPoint(p.key, "currentSeller", ev.target.value)} />
              </div>
              <div className="field">
                <label htmlFor={`${p.key}-osd`}>Operator (OSD)</label>
                <input id={`${p.key}-osd`} className="input" placeholder="np. operator sieci z faktury" value={p.operator} onChange={(ev) => setPoint(p.key, "operator", ev.target.value)} />
              </div>
            </div>
            <div className="form-row" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))" }}>
              <div className="field">
                <label htmlFor={`${p.key}-tariff`}>Grupa taryfowa</label>
                <select id={`${p.key}-tariff`} className="select" value={p.tariff} onChange={(ev) => setPoint(p.key, "tariff", ev.target.value)}>
                  <option value="">–</option>
                  {tariffs.map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label htmlFor={`${p.key}-usage`}>Roczne zużycie (MWh)</label>
                <input id={`${p.key}-usage`} className="input" inputMode="decimal" value={p.annualUsageMWh} onChange={(ev) => setPoint(p.key, "annualUsageMWh", ev.target.value)} />
              </div>
              <div className="field">
                <label htmlFor={`${p.key}-power`}>Moc umowna (kW)</label>
                <input id={`${p.key}-power`} className="input" inputMode="decimal" value={p.contractedPowerKw} onChange={(ev) => setPoint(p.key, "contractedPowerKw", ev.target.value)} />
              </div>
              <div className="field">
                <label htmlFor={`${p.key}-end`}>Koniec obecnej umowy</label>
                <input id={`${p.key}-end`} className="input" type="date" value={p.contractEndDate} onChange={(ev) => setPoint(p.key, "contractEndDate", ev.target.value)} />
              </div>
            </div>
          </fieldset>
        );
      })}
      <div>
        <button type="button" className="btn btn--secondary" onClick={() => setPoints((prev) => [...prev, emptyPoint(media === "GAZ" ? "GAZ" : "PRAD")])}>
          <Icon name="plus" size={18} /> Dodaj kolejny punkt poboru
        </button>
      </div>
    </div>
  );
}
