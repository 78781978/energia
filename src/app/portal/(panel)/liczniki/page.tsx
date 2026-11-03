import Link from "next/link";
import { requireClient } from "@/lib/auth";
import { meterRows, PRIORITY_LABEL } from "@/lib/meters";
import { PageHead, fmtDate, fmtNum } from "@/components/app/ui";
import { Icon } from "@/components/Icon";

export const metadata = { title: "Liczniki i umowy" };

export default async function MetersPage() {
  const user = await requireClient();
  const rows = await meterRows(user.id);
  const sumSavings = rows.reduce((s, r) => s + (r.savingsPln ?? 0), 0);
  const sumUsage = rows.reduce((s, r) => s + (r.usageMWh ?? 0), 0);
  const soon = rows.filter((r) => r.noticeDate && +r.noticeDate - Date.now() < 60 * 864e5 && +r.noticeDate > Date.now());
  return (
    <>
      <PageHead
        title="Liczniki i umowy"
        sub="Wszystkie punkty poboru prądu (PPE) i gazu (PPG), dostawcy, ceny i terminy umów w jednym miejscu."
        actions={
          rows.length > 0 && (
            <div className="btn-row">
              <a className="btn btn--secondary" href="/api/portal/liczniki/?format=csv">
                <Icon name="download" size={18} /> Eksport do Excela (CSV)
              </a>
              <a className="btn btn--ghost" href="/api/portal/kalendarz/">
                <Icon name="clock" size={18} /> Terminy do kalendarza
              </a>
            </div>
          )
        }
      />
      {soon.length > 0 && (
        <div className="alert alert--warn" style={{ marginBottom: 24 }}>
          <Icon name="clock" />
          <p>
            <strong>Zbliża się termin wypowiedzenia umowy</strong>
            {soon.map((r) => `${r.name || r.ppeNumber || "licznik"} – do ${fmtDate(r.noticeDate)}`).join(" · ")}. Złóż zamówienie, aby zdążyć ze zmianą sprzedawcy.
          </p>
        </div>
      )}
      {rows.length === 0 ? (
        <div className="panel empty">
          <h3>Nie masz jeszcze liczników</h3>
          <p>Liczniki dodasz w generatorze ofert (wczytamy je z faktury) albo w zakładce „Dane firmy”.</p>
          <Link className="btn btn--lg" href="/portal/wniosek/">
            Generator ofert <Icon name="arrowRight" size={18} className="arrow" />
          </Link>
        </div>
      ) : (
        <section className="panel">
          <div className="table-wrap">
            <table className="data-table data-table--wide">
              <thead>
                <tr>
                  <th>Nazwa licznika</th>
                  <th>Adres</th>
                  <th>PPE / PPG</th>
                  <th>Status</th>
                  <th>Dostawca</th>
                  <th>Produkt</th>
                  <th>Cena netto</th>
                  <th>Początek umowy</th>
                  <th>Koniec umowy</th>
                  <th>Oszczędności</th>
                  <th>Priorytet</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <strong>
                        <Icon name={r.medium === "GAZ" ? "flame" : "bolt"} size={14} /> {r.name || (r.medium === "GAZ" ? "Gaz" : "Prąd")}
                      </strong>
                      <div className="muted small">{r.meterNumber ? `licznik ${r.meterNumber}` : r.companyName}</div>
                    </td>
                    <td>{r.address || "–"}</td>
                    <td style={{ whiteSpace: "nowrap" }}>{r.ppeNumber ?? "–"}</td>
                    <td>{r.status}</td>
                    <td>{r.supplier ?? "–"}</td>
                    <td>{r.product ?? "–"}</td>
                    <td style={{ whiteSpace: "nowrap" }}>{r.priceNetMWh != null ? `${fmtNum(r.priceNetMWh)} zł/MWh` : "–"}</td>
                    <td>{fmtDate(r.start) || "–"}</td>
                    <td>
                      {fmtDate(r.end) || "–"}
                      {r.currentEnd && <div className="muted small">obecna do {fmtDate(r.currentEnd)}</div>}
                    </td>
                    <td style={{ whiteSpace: "nowrap" }}>{r.savingsPln != null ? `${fmtNum(r.savingsPln, 0)} zł` : "–"}</td>
                    <td>{r.priority ? <span className="prio" data-p={r.priority}>{PRIORITY_LABEL[r.priority] ?? r.priority}</span> : "–"}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <th colSpan={3}>Suma: {rows.length} {rows.length === 1 ? "licznik" : rows.length < 5 ? "liczniki" : "liczników"}</th>
                  <th colSpan={6}>{sumUsage > 0 ? `Roczne zużycie: ${fmtNum(sumUsage)} MWh` : ""}</th>
                  <th colSpan={2}>{sumSavings > 0 ? `${fmtNum(sumSavings, 0)} zł` : ""}</th>
                </tr>
              </tfoot>
            </table>
          </div>
          <p className="small muted" style={{ marginBottom: 0 }}>
            Daty nowych umów, szacowane oszczędności i priorytety uzupełnia doradca. Dane liczników zmienisz w zakładce <Link href="/portal/moje-dane/">Dane firmy</Link>.
          </p>
        </section>
      )}
    </>
  );
}
