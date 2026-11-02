"use client";

import { useActionState, useEffect, useRef } from "react";
import { addNote, adminUploadDocument, assignOffer, changeStatus, createAdmin, saveOffer, sendClientMessage, updateApplicationParams } from "@/app/actions/admin";
import { initialFormState, type FormState } from "@/lib/forms";
import { FieldError, FormAlert, SubmitButton, invalid } from "@/components/forms";
import { APP_STATUSES, DOC_KINDS, MEDIA, PRICE_MODELS, STATUS_LABEL } from "@/lib/constants";

/** Czyści formularz po udanym zapisie. */
function useResetOnOk(state: FormState) {
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.ok) ref.current?.reset();
  }, [state]);
  return ref;
}

export function StatusForm({ applicationId, current }: { applicationId: string; current: string }) {
  const [state, action] = useActionState(changeStatus, initialFormState);
  return (
    <form action={action} className="form" style={{ gap: 12 }}>
      <input type="hidden" name="applicationId" value={applicationId} />
      <div className="field">
        <label htmlFor="st">Nowy status</label>
        <select id="st" className="select" name="status" defaultValue={current}>
          {APP_STATUSES.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABEL[s]}
            </option>
          ))}
        </select>
      </div>
      <div className="field">
        <label htmlFor="st-c">
          Komentarz <span className="opt">(widoczny dla klienta w historii)</span>
        </label>
        <input id="st-c" className="input" name="comment" />
      </div>
      <label className="check">
        <input type="checkbox" name="notify" defaultChecked />
        <span>Powiadom klienta e-mailem</span>
      </label>
      <FormAlert state={state} />
      <div>
        <SubmitButton className="btn btn--sm" arrow={false} pending="Zapisuję…">
          Zmień status
        </SubmitButton>
      </div>
    </form>
  );
}

export function NoteForm({ applicationId }: { applicationId: string }) {
  const [state, action] = useActionState(addNote, initialFormState);
  const ref = useResetOnOk(state);
  return (
    <form ref={ref} action={action} className="form" style={{ gap: 12 }}>
      <input type="hidden" name="applicationId" value={applicationId} />
      <label htmlFor="note" className="sr-only">
        Notatka
      </label>
      <textarea id="note" className="textarea" name="body" rows={3} placeholder="Notatka wewnętrzna – niewidoczna dla klienta" />
      <FormAlert state={state} />
      <div>
        <SubmitButton className="btn btn--sm btn--dark" arrow={false} pending="Zapisuję…">
          Dodaj notatkę
        </SubmitButton>
      </div>
    </form>
  );
}

export function MessageForm({ applicationId }: { applicationId: string }) {
  const [state, action] = useActionState(sendClientMessage, initialFormState);
  const ref = useResetOnOk(state);
  return (
    <form ref={ref} action={action} className="form" style={{ gap: 12 }}>
      <input type="hidden" name="applicationId" value={applicationId} />
      <label htmlFor="msg" className="sr-only">
        Komunikat do klienta
      </label>
      <textarea id="msg" className="textarea" name="body" rows={3} placeholder="Komunikat widoczny na pulpicie klienta" />
      <label className="check">
        <input type="checkbox" name="email" defaultChecked />
        <span>Wyślij też e-mail z powiadomieniem</span>
      </label>
      <FormAlert state={state} />
      <div>
        <SubmitButton className="btn btn--sm" arrow={false} pending="Wysyłanie…">
          Wyślij komunikat
        </SubmitButton>
      </div>
    </form>
  );
}

export function AdminUploadForm({ applicationId }: { applicationId: string }) {
  const [state, action] = useActionState(adminUploadDocument, initialFormState);
  const ref = useResetOnOk(state);
  return (
    <form ref={ref} action={action} className="form" style={{ gap: 12 }}>
      <input type="hidden" name="applicationId" value={applicationId} />
      <div className="form-row">
        <div className="field">
          <label htmlFor="kind">Rodzaj</label>
          <select id="kind" className="select" name="kind" defaultValue="UMOWA">
            {Object.entries(DOC_KINDS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="file">Plik (PDF, JPG, PNG)</label>
          <input id="file" className="input" type="file" name="file" accept="application/pdf,image/jpeg,image/png" required style={{ padding: 10 }} />
        </div>
      </div>
      <label className="check">
        <input type="checkbox" name="visibleToClient" defaultChecked />
        <span>Widoczny dla klienta</span>
      </label>
      <label className="check">
        <input type="checkbox" name="setWaiting" defaultChecked />
        <span>Dla umowy: ustaw status „Oczekuje na podpis” i powiadom klienta</span>
      </label>
      <FormAlert state={state} />
      <div>
        <SubmitButton className="btn btn--sm" arrow={false} pending="Przesyłanie…">
          Dodaj dokument
        </SubmitButton>
      </div>
    </form>
  );
}

export function AssignOfferForm({ applicationId, offers }: { applicationId: string; offers: { id: string; label: string }[] }) {
  const [state, action] = useActionState(assignOffer, initialFormState);
  const ref = useResetOnOk(state);
  if (!offers.length) return <p className="muted small">Brak aktywnych ofert. Dodaj je w zakładce „Oferty i cenniki”.</p>;
  return (
    <form ref={ref} action={action} className="form" style={{ gap: 12 }}>
      <input type="hidden" name="applicationId" value={applicationId} />
      <div className="field">
        <label htmlFor="offer">Oferta</label>
        <select id="offer" className="select" name="offerId" defaultValue="">
          <option value="">Wybierz…</option>
          {offers.map((o) => (
            <option key={o.id} value={o.id}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
      <div className="form-row">
        <div className="field">
          <label htmlFor="cp">
            Cena indywidualna <span className="opt">(zł/MWh, opcj.)</span>
          </label>
          <input id="cp" className="input" name="customPriceNetMWh" inputMode="decimal" />
        </div>
        <div className="field">
          <label htmlFor="on">
            Uwaga dla klienta <span className="opt">(opcj.)</span>
          </label>
          <input id="on" className="input" name="note" />
        </div>
      </div>
      <label className="check">
        <input type="checkbox" name="notify" />
        <span>Powiadom klienta, że oferty są gotowe</span>
      </label>
      <FormAlert state={state} />
      <div>
        <SubmitButton className="btn btn--sm" arrow={false} pending="Zapisuję…">
          Przypisz ofertę
        </SubmitButton>
      </div>
    </form>
  );
}

export function ParamsForm({ app }: { app: { id: string; media: string; priceModel: string; years: string; tariff: string | null; annualUsageMWh: number | null; wantsCall: boolean } }) {
  const [state, action] = useActionState(updateApplicationParams, initialFormState);
  return (
    <form action={action} className="form" style={{ gap: 12 }}>
      <input type="hidden" name="applicationId" value={app.id} />
      <div className="form-row">
        <div className="field">
          <label htmlFor="p-media">Media</label>
          <select id="p-media" className="select" name="media" defaultValue={app.media}>
            {Object.entries(MEDIA).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="p-model">Model ceny</label>
          <select id="p-model" className="select" name="priceModel" defaultValue={app.priceModel}>
            {Object.entries(PRICE_MODELS).map(([k, v]) => (
              <option key={k} value={k}>
                {v.label}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="form-row form-row--3">
        <div className="field">
          <label htmlFor="p-years">Lata</label>
          <input id="p-years" className="input" name="years" defaultValue={app.years} />
        </div>
        <div className="field">
          <label htmlFor="p-tariff">Taryfa</label>
          <input id="p-tariff" className="input" name="tariff" defaultValue={app.tariff ?? ""} />
        </div>
        <div className="field">
          <label htmlFor="p-usage">Zużycie (MWh)</label>
          <input id="p-usage" className="input" name="annualUsageMWh" defaultValue={app.annualUsageMWh ?? ""} inputMode="decimal" />
        </div>
      </div>
      <label className="check">
        <input type="checkbox" name="wantsCall" defaultChecked={app.wantsCall} />
        <span>Klient prosi o telefon</span>
      </label>
      <FormAlert state={state} />
      <div>
        <SubmitButton className="btn btn--sm btn--ghost" arrow={false} pending="Zapisuję…">
          Zapisz parametry
        </SubmitButton>
      </div>
    </form>
  );
}

type OfferData = {
  id?: string;
  name: string;
  supplier: string;
  media: string;
  priceModel: string;
  years: string;
  priceNetMWh: number | null;
  tradeFeeMonthly: number | null;
  validUntil: string;
  description: string;
  isActive: boolean;
  hasPdf?: boolean;
};

export function OfferForm({ offer }: { offer?: OfferData }) {
  const [state, action] = useActionState(saveOffer, initialFormState);
  const o: OfferData = offer ?? { name: "", supplier: "", media: "PRAD", priceModel: "STALA", years: "", priceNetMWh: null, tradeFeeMonthly: null, validUntil: "", description: "", isActive: true };
  return (
    <form action={action} className="form" style={{ gap: 14 }}>
      {o.id && <input type="hidden" name="offerId" value={o.id} />}
      <div className="form-row">
        <div className="field">
          <label htmlFor="o-name">Nazwa oferty</label>
          <input id="o-name" className="input" name="name" defaultValue={o.name} {...invalid(state, "name")} />
          <FieldError state={state} name="name" />
        </div>
        <div className="field">
          <label htmlFor="o-sup">Sprzedawca</label>
          <input id="o-sup" className="input" name="supplier" defaultValue={o.supplier} {...invalid(state, "supplier")} />
          <FieldError state={state} name="supplier" />
        </div>
      </div>
      <div className="form-row form-row--3">
        <div className="field">
          <label htmlFor="o-media">Media</label>
          <select id="o-media" className="select" name="media" defaultValue={o.media}>
            {Object.entries(MEDIA).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="o-model">Model ceny</label>
          <select id="o-model" className="select" name="priceModel" defaultValue={o.priceModel}>
            {Object.entries(PRICE_MODELS).map(([k, v]) => (
              <option key={k} value={k}>
                {v.label}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="o-years">Lata (np. 2027,2028)</label>
          <input id="o-years" className="input" name="years" defaultValue={o.years} {...invalid(state, "years")} />
          <FieldError state={state} name="years" />
        </div>
      </div>
      <div className="form-row form-row--3">
        <div className="field">
          <label htmlFor="o-price">Cena netto (zł/MWh)</label>
          <input id="o-price" className="input" name="priceNetMWh" inputMode="decimal" defaultValue={o.priceNetMWh ?? ""} />
        </div>
        <div className="field">
          <label htmlFor="o-fee">Opłata handlowa (zł/mies.)</label>
          <input id="o-fee" className="input" name="tradeFeeMonthly" inputMode="decimal" defaultValue={o.tradeFeeMonthly ?? ""} />
        </div>
        <div className="field">
          <label htmlFor="o-valid">Ważna do</label>
          <input id="o-valid" className="input" type="date" name="validUntil" defaultValue={o.validUntil} />
        </div>
      </div>
      <div className="field">
        <label htmlFor="o-desc">
          Opis / warunki <span className="opt">(opcj.)</span>
        </label>
        <textarea id="o-desc" className="textarea" name="description" rows={3} defaultValue={o.description} />
      </div>
      <div className="field">
        <label htmlFor="o-file">Cennik PDF {o.hasPdf && <span className="opt">(dodany – nowy plik zastąpi obecny)</span>}</label>
        <input id="o-file" className="input" type="file" name="file" accept="application/pdf" style={{ padding: 10 }} />
        <FieldError state={state} name="file" />
      </div>
      <label className="check">
        <input type="checkbox" name="isActive" defaultChecked={o.isActive} />
        <span>Oferta aktywna (dostępna do przypisania)</span>
      </label>
      <FormAlert state={state} />
      <div>
        <SubmitButton className="btn" arrow={false} pending="Zapisuję…">
          {o.id ? "Zapisz zmiany" : "Dodaj ofertę"}
        </SubmitButton>
      </div>
    </form>
  );
}

export function NewAdminForm() {
  const [state, action] = useActionState(createAdmin, initialFormState);
  const ref = useResetOnOk(state);
  return (
    <form ref={ref} action={action} className="form" style={{ gap: 12 }}>
      <div className="form-row form-row--3">
        <div className="field">
          <label htmlFor="a-email">E-mail</label>
          <input id="a-email" className="input" type="email" name="email" required />
        </div>
        <div className="field">
          <label htmlFor="a-name">Imię i nazwisko</label>
          <input id="a-name" className="input" name="name" />
        </div>
        <div className="field">
          <label htmlFor="a-pass">Hasło startowe</label>
          <input id="a-pass" className="input" type="text" name="password" required autoComplete="off" />
        </div>
      </div>
      <FormAlert state={state} />
      <div>
        <SubmitButton className="btn btn--sm" arrow={false} pending="Zapisuję…">
          Dodaj administratora
        </SubmitButton>
      </div>
    </form>
  );
}
