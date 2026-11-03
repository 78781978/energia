"use client";

import { useActionState, useMemo, useState } from "react";
import { updateMyCompany } from "@/app/actions/portal";
import { adminUpdateCompany } from "@/app/actions/admin";
import { initialFormState } from "@/lib/forms";
import { FieldError, FormAlert, SubmitButton, invalid } from "@/components/forms";
import { LEGAL_FORMS } from "@/lib/constants";
import { PointsEditor, type CompanyDraft, type PointDraft } from "@/components/app/PointsEditor";

export function CompanyForm({ company, points: initial, mode }: { company: CompanyDraft; points: PointDraft[]; mode: "client" | "admin" }) {
  const [state, action] = useActionState(mode === "admin" ? adminUpdateCompany : updateMyCompany, initialFormState);
  const [c, setC] = useState(company);
  const [points, setPoints] = useState<PointDraft[]>(initial);
  const set = (k: keyof CompanyDraft) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setC((p) => ({ ...p, [k]: e.target.type === "checkbox" ? (e.target as HTMLInputElement).checked : e.target.value }));
  const setPoint = (key: string, k: keyof PointDraft, v: string) => setPoints((prev) => prev.map((p) => (p.key === key ? { ...p, [k]: v } : p)));
  const pointsJson = useMemo(() => JSON.stringify(points.map(({ key: _k, ...p }) => p)), [points]);
  const errors = state.fieldErrors ?? {};

  const F = ({ name, label, opt, ...rest }: { name: keyof CompanyDraft; label: string; opt?: boolean } & React.InputHTMLAttributes<HTMLInputElement>) => (
    <div className="field">
      <label htmlFor={`${company.id}-${name}`}>
        {label} {opt && <span className="opt">(opcjonalnie)</span>}
      </label>
      <input id={`${company.id}-${name}`} className="input" name={name} value={c[name] as string} onChange={set(name)} {...invalid(state, name)} {...rest} />
      <FieldError state={state} name={name} />
    </div>
  );

  return (
    <form action={action} className="panel form" style={{ gap: 16 }}>
      <input type="hidden" name="companyId" value={company.id} />
      <input type="hidden" name="points" value={pointsJson} />
      <div className="panel__head" style={{ margin: 0 }}>
        <h2>{c.companyName || "Firma"}</h2>
      </div>
      <div className="form-row">
        {F({ name: "companyName", label: "Nazwa firmy" })}
        {F({ name: "nip", label: "NIP", inputMode: "numeric" })}
      </div>
      <div className="form-row">
        {F({ name: "regon", label: "REGON", opt: true, inputMode: "numeric" })}
        <div className="field">
          <label htmlFor={`${company.id}-legalForm`}>Forma działalności</label>
          <select id={`${company.id}-legalForm`} className="select" name="legalForm" value={c.legalForm} onChange={set("legalForm")}>
            <option value="">Wybierz…</option>
            {LEGAL_FORMS.map((f) => (
              <option key={f}>{f}</option>
            ))}
          </select>
        </div>
      </div>
      <h3 style={{ margin: "8px 0 0" }}>Osoba kontaktowa</h3>
      <div className="form-row form-row--3">
        {F({ name: "contactName", label: "Imię i nazwisko" })}
        {F({ name: "contactPhone", label: "Telefon", type: "tel" })}
        {F({ name: "contactEmail", label: "E-mail", type: "email" })}
      </div>
      <h3 style={{ margin: "8px 0 0" }}>Adres siedziby</h3>
      <div className="form-row form-row--3">
        {F({ name: "hqStreet", label: "Ulica i numer" })}
        {F({ name: "hqPostalCode", label: "Kod pocztowy", placeholder: "00-000" })}
        {F({ name: "hqCity", label: "Miejscowość" })}
      </div>
      <label className="check">
        <input type="checkbox" name="corrDifferent" checked={c.corrDifferent} onChange={set("corrDifferent")} />
        <span>Inny adres korespondencyjny</span>
      </label>
      {c.corrDifferent && (
        <div className="form-row form-row--3">
          {F({ name: "corrStreet", label: "Ulica i numer" })}
          {F({ name: "corrPostalCode", label: "Kod pocztowy", placeholder: "00-000" })}
          {F({ name: "corrCity", label: "Miejscowość" })}
        </div>
      )}
      <h3 style={{ margin: "8px 0 0" }}>Punkty poboru</h3>
      <PointsEditor points={points} setPoint={setPoint} setPoints={setPoints} media="" errors={errors} />
      <p className="hint" style={{ margin: 0 }}>
        Usunięcie punktu z listy nie kasuje go z wniosków, w których już występuje.
      </p>
      <FormAlert state={state} />
      <div>
        <SubmitButton className="btn" arrow={false} pending="Zapisuję…">
          Zapisz zmiany
        </SubmitButton>
      </div>
    </form>
  );
}
