"use client";

import { useActionState } from "react";
import { refreshMarketPrices, savePriceList } from "@/app/actions/prices";
import { initialFormState } from "@/lib/forms";
import { FieldError, FormAlert, SubmitButton, invalid } from "@/components/forms";

export function RefreshPricesForm() {
  const [state, action] = useActionState(refreshMarketPrices, initialFormState);
  return (
    <form action={action} className="form" style={{ gap: 8 }}>
      <FormAlert state={state} />
      <div>
        <SubmitButton className="btn btn--sm btn--secondary" arrow={false} pending="Pobieram…">
          Pobierz ceny teraz
        </SubmitButton>
      </div>
    </form>
  );
}

const EXAMPLE = `Media\tProdukt\tTaryfa\tRok\tCena zł/MWh\tOpłata handlowa zł/mies.
Prąd\tStała cena\tC11\t2027\t612,50\t19
Prąd\tStała cena\tC21\t2027\t598,00\t39
Gaz\tStała cena\tW-3.6\t2027\t245,10\t15`;

export function PriceListForm({ defaultFrom, defaultTo }: { defaultFrom: string; defaultTo: string }) {
  const [state, action] = useActionState(savePriceList, initialFormState);
  const v = state.values ?? {};
  return (
    <form action={action} className="form">
      <div className="form-row">
        <div className="field">
          <label htmlFor="pl-supplier">Sprzedawca</label>
          <input id="pl-supplier" className="input" name="supplier" defaultValue={v.supplier} required {...invalid(state, "supplier")} />
          <FieldError state={state} name="supplier" />
        </div>
        <div className="field">
          <label htmlFor="pl-name">
            Nazwa cennika <span className="opt">(opcj.)</span>
          </label>
          <input id="pl-name" className="input" name="name" defaultValue={v.name} placeholder="np. Cennik tygodniowy MŚP" />
        </div>
      </div>
      <div className="form-row">
        <div className="field">
          <label htmlFor="pl-from">Obowiązuje od</label>
          <input id="pl-from" className="input" type="date" name="validFrom" defaultValue={v.validFrom ?? defaultFrom} required {...invalid(state, "validFrom")} />
          <FieldError state={state} name="validFrom" />
        </div>
        <div className="field">
          <label htmlFor="pl-to">
            Obowiązuje do <span className="opt">(włącznie)</span>
          </label>
          <input id="pl-to" className="input" type="date" name="validTo" defaultValue={v.validTo ?? defaultTo} {...invalid(state, "validTo")} />
          <FieldError state={state} name="validTo" />
        </div>
      </div>
      <div className="field">
        <label htmlFor="pl-table">Tabela cen – skopiuj z Excela i wklej</label>
        <textarea
          id="pl-table"
          className="textarea"
          name="table"
          rows={9}
          defaultValue={v.table}
          placeholder={EXAMPLE}
          spellCheck={false}
          style={{ fontFamily: "ui-monospace, Menlo, Consolas, monospace", fontSize: 13 }}
          {...invalid(state, "table")}
        />
        <FieldError state={state} name="table" />
        <p className="hint">
          Pierwszy wiersz to nagłówki. Wymagana jest kolumna z ceną (np. „Cena zł/MWh”); pozostałe kolumny są opcjonalne: Media (prąd/gaz),
          Produkt, Taryfa, Rok, Opłata handlowa, Uwagi. Można też wkleić plik CSV.
        </p>
      </div>
      <div className="field">
        <label htmlFor="pl-file">
          Oryginał cennika PDF <span className="opt">(opcj., tylko dla administratorów)</span>
        </label>
        <input id="pl-file" className="input" type="file" name="file" accept="application/pdf" style={{ padding: 10 }} />
        <FieldError state={state} name="file" />
      </div>
      <div className="field">
        <label htmlFor="pl-note">
          Uwagi wewnętrzne <span className="opt">(opcj.)</span>
        </label>
        <textarea id="pl-note" className="textarea" name="note" rows={2} defaultValue={v.note} />
      </div>
      <FormAlert state={state} />
      <div>
        <SubmitButton className="btn" arrow={false} pending="Zapisuję…">
          Zapisz cennik
        </SubmitButton>
      </div>
    </form>
  );
}
