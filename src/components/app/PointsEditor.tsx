"use client";

import { Icon } from "@/components/Icon";
import { TARIFFS_GAS, TARIFFS_POWER, type Media } from "@/lib/constants";

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
  name: string;
  meterNumber: string;
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
  noticeDays: string;
};

let keySeq = 0;
export const emptyPoint = (medium: "PRAD" | "GAZ" = "PRAD", key?: string): PointDraft => ({
  key: key ?? `p${Date.now()}${keySeq++}`,
  medium,
  name: "",
  meterNumber: "",
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
  noticeDays: "",
});

/** Edycja liczników (punktów poboru) – używana w kreatorze, w „Moich danych” i w panelu administratora. */
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
        const code = p.medium === "GAZ" ? "PPG" : "PPE";
        const advanced = Boolean(p.currentSeller || p.operator || p.tariff || p.annualUsageMWh || p.contractedPowerKw || p.contractEndDate || p.noticeDays);
        return (
          <fieldset key={p.key} className="ppe-card">
            <div className="ppe-card__head">
              <legend style={{ fontWeight: 700 }}>
                <Icon name={p.medium === "GAZ" ? "flame" : "bolt"} size={18} /> Licznik {i + 1}
                {p.name ? ` – ${p.name}` : ""} {p.id && <span className="badge badge--plain">zapisany</span>}
              </legend>
              {points.length > 1 && (
                <button type="button" className="btn btn--ghost btn--sm" onClick={() => setPoints((prev) => prev.filter((x) => x.key !== p.key))}>
                  <Icon name="trash" size={16} /> Usuń
                </button>
              )}
            </div>
            <div className="form-row form-row--3">
              <div className="field">
                <label htmlFor={`${p.key}-medium`}>Rodzaj</label>
                <select id={`${p.key}-medium`} className="select" value={p.medium} onChange={(ev) => setPoint(p.key, "medium", ev.target.value)}>
                  <option value="PRAD">Energia elektryczna</option>
                  <option value="GAZ">Gaz</option>
                </select>
              </div>
              <div className="field">
                <label htmlFor={`${p.key}-name`}>
                  Nazwa licznika <span className="opt">(opcjonalnie)</span>
                </label>
                <input id={`${p.key}-name`} className="input" placeholder="np. Biuro, Hala nr 2" value={p.name} onChange={(ev) => setPoint(p.key, "name", ev.target.value)} />
              </div>
              <div className="field">
                <label htmlFor={`${p.key}-meter`}>Numer licznika</label>
                <input id={`${p.key}-meter`} className="input" placeholder="z faktury lub tabliczki licznika" value={p.meterNumber} onChange={(ev) => setPoint(p.key, "meterNumber", ev.target.value)} />
              </div>
            </div>
            <div className="field">
              <label htmlFor={`${p.key}-ppe`}>Numer {code}</label>
              <input
                id={`${p.key}-ppe`}
                className="input"
                placeholder={`Numer punktu poboru (${code}) – znajdziesz go na fakturze`}
                value={p.ppeNumber}
                onChange={(ev) => setPoint(p.key, "ppeNumber", ev.target.value)}
                aria-invalid={e("ppeNumber") ? true : undefined}
              />
              {e("ppeNumber") && <span className="error-text">{e("ppeNumber")}</span>}
            </div>
            <div className="form-row form-row--3">
              <div className="field">
                <label htmlFor={`${p.key}-street`}>Adres {code}</label>
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
            <details className="ppe-card__more" open={advanced}>
              <summary>Więcej danych (sprzedawca, taryfa, zużycie, umowa)</summary>
              <div className="form-row" style={{ marginTop: 12 }}>
                <div className="field">
                  <label htmlFor={`${p.key}-seller`}>Obecny sprzedawca</label>
                  <input id={`${p.key}-seller`} className="input" placeholder="nazwa sprzedawcy z faktury" value={p.currentSeller} onChange={(ev) => setPoint(p.key, "currentSeller", ev.target.value)} />
                </div>
                <div className="field">
                  <label htmlFor={`${p.key}-osd`}>Operator (OSD)</label>
                  <input id={`${p.key}-osd`} className="input" placeholder="operator sieci z faktury" value={p.operator} onChange={(ev) => setPoint(p.key, "operator", ev.target.value)} />
                </div>
              </div>
              <div className="form-row" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))" }}>
                <div className="field">
                  <label htmlFor={`${p.key}-tariff`}>Grupa taryfowa</label>
                  <select id={`${p.key}-tariff`} className="select" value={p.tariff} onChange={(ev) => setPoint(p.key, "tariff", ev.target.value)}>
                    <option value="">–</option>
                    {p.tariff && !tariffs.includes(p.tariff) && <option>{p.tariff}</option>}
                    {tariffs.map((t) => (
                      <option key={t}>{t}</option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label htmlFor={`${p.key}-usage`}>Roczne zużycie (MWh)</label>
                  <input id={`${p.key}-usage`} className="input" inputMode="decimal" value={p.annualUsageMWh} onChange={(ev) => setPoint(p.key, "annualUsageMWh", ev.target.value)} />
                </div>
                {p.medium === "PRAD" && (
                  <div className="field">
                    <label htmlFor={`${p.key}-power`}>Moc umowna (kW)</label>
                    <input id={`${p.key}-power`} className="input" inputMode="decimal" value={p.contractedPowerKw} onChange={(ev) => setPoint(p.key, "contractedPowerKw", ev.target.value)} />
                  </div>
                )}
                <div className="field">
                  <label htmlFor={`${p.key}-end`}>Koniec obecnej umowy</label>
                  <input id={`${p.key}-end`} className="input" type="date" value={p.contractEndDate} onChange={(ev) => setPoint(p.key, "contractEndDate", ev.target.value)} />
                </div>
                <div className="field">
                  <label htmlFor={`${p.key}-notice`}>Okres wypowiedzenia (dni)</label>
                  <input id={`${p.key}-notice`} className="input" inputMode="numeric" placeholder="np. 30" value={p.noticeDays} onChange={(ev) => setPoint(p.key, "noticeDays", ev.target.value)} />
                </div>
              </div>
            </details>
          </fieldset>
        );
      })}
      <div className="btn-row">
        <button type="button" className="btn btn--secondary" onClick={() => setPoints((prev) => [...prev, emptyPoint(media === "GAZ" ? "GAZ" : "PRAD")])}>
          <Icon name="plus" size={18} /> Dodaj {media === "GAZ" ? "licznik gazu" : "licznik"}
        </button>
        {media === "PRAD_GAZ" && (
          <button type="button" className="btn btn--ghost" onClick={() => setPoints((prev) => [...prev, emptyPoint("GAZ")])}>
            <Icon name="flame" size={18} /> Dodaj licznik gazu
          </button>
        )}
      </div>
    </div>
  );
}
