import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { PageHead, fmtDate, fmtDateTime, fmtNum } from "@/components/app/ui";
import { PriceListForm, RefreshPricesForm } from "@/components/app/PriceForms";
import { Icon } from "@/components/Icon";
import { PSE_SOURCE, plDay, priceListStatus, startOfDay } from "@/lib/prices";

export const metadata = { title: "Ceny energii" };
export const dynamic = "force-dynamic";

type SP = Promise<{ media?: string; rok?: string; taryfa?: string; usunieto?: string }>;

const STATUS = {
  AKTUALNY: { label: "Aktualny", cls: "badge--ok" },
  PRZYSZLY: { label: "Przyszły", cls: "badge--info" },
  ARCHIWALNY: { label: "Archiwalny", cls: "badge--plain" },
} as const;

export default async function PricesPage({ searchParams }: { searchParams: SP }) {
  await requireAdmin();
  const sp = await searchParams;
  const now = new Date();
  const today = startOfDay(now);

  const [market, lists] = await Promise.all([
    db.marketPrice.findMany({ where: { source: PSE_SOURCE }, orderBy: { day: "desc" }, take: 30 }),
    db.priceList.findMany({ orderBy: [{ validFrom: "desc" }, { createdAt: "desc" }], take: 60, include: { _count: { select: { items: true } } } }),
  ]);

  // pozycje z cenników obowiązujących dziś – porównanie sprzedawców
  const media = sp.media === "GAZ" ? "GAZ" : sp.media === "PRAD" ? "PRAD" : "";
  const items = await db.priceListItem.findMany({
    where: {
      priceList: { validFrom: { lte: now }, OR: [{ validTo: null }, { validTo: { gte: today } }] },
      ...(media ? { media } : {}),
      ...(sp.rok ? { year: { contains: sp.rok.slice(0, 4) } } : {}),
      ...(sp.taryfa ? { tariff: sp.taryfa.slice(0, 30) } : {}),
    },
    include: { priceList: { select: { id: true, supplier: true, validTo: true } } },
    orderBy: { price: "asc" },
    take: 300,
  });
  const allCurrent = await db.priceListItem.findMany({
    where: { priceList: { validFrom: { lte: now }, OR: [{ validTo: null }, { validTo: { gte: today } }] } },
    select: { year: true, tariff: true },
  });
  const years = [...new Set(allCurrent.map((i) => i.year).filter(Boolean) as string[])].sort();
  const tariffs = [...new Set(allCurrent.map((i) => i.tariff).filter(Boolean) as string[])].sort();
  const groupKey = (i: (typeof items)[number]) => [i.media, i.product.toLowerCase(), i.tariff ?? "", i.year ?? ""].join("|");
  const best = new Map<string, number>();
  const groupSize = new Map<string, number>();
  for (const i of items) {
    const k = groupKey(i);
    groupSize.set(k, (groupSize.get(k) ?? 0) + 1);
    if (!best.has(k) || i.price < best.get(k)!) best.set(k, i.price);
  }

  const latest = market[0];
  const todayRow = market.find((m) => m.day === plDay());
  const tomorrowRow = market.find((m) => m.day === plDay(now, 1));
  const week = market.slice(0, 7);
  const weekAvg = week.length ? week.reduce((s, m) => s + m.avg, 0) / week.length : null;

  return (
    <>
      <PageHead
        title="Ceny energii"
        sub={
          <>
            Ceny rynkowe i tygodniowe cenniki sprzedawców. <strong>Widoczne wyłącznie dla administratorów</strong> – klienci nie mają do nich
            dostępu.
          </>
        }
      />
      {sp.usunieto && (
        <div className="alert alert--ok" style={{ marginBottom: 16 }}>
          <Icon name="checkCircle" />
          <p>Cennik został usunięty.</p>
        </div>
      )}

      <div className="panel">
        <div className="panel__head">
          <h2>Ceny rynkowe – RCE (PSE)</h2>
          <RefreshPricesForm />
        </div>
        <p className="muted small" style={{ marginTop: 0 }}>
          Rynkowa cena energii elektrycznej publikowana przez PSE (zł/MWh, netto, na podstawie notowań Rynku Dnia Następnego). Pobierana
          automatycznie raz na godzinę – ceny na kolejną dobę pojawiają się zwykle po południu.
          {latest && <> Ostatnie pobranie: {fmtDateTime(latest.fetchedAt)}.</>}
        </p>
        {market.length ? (
          <>
            <div className="stat-grid" style={{ marginBottom: 16 }}>
              <div className="stat">
                <div className="stat__label">Jutro – średnia</div>
                <div className="stat__value">{tomorrowRow ? fmtNum(tomorrowRow.avg) : "–"}</div>
              </div>
              <div className="stat">
                <div className="stat__label">Dziś – średnia</div>
                <div className="stat__value">{todayRow ? fmtNum(todayRow.avg) : "–"}</div>
              </div>
              <div className="stat">
                <div className="stat__label">Dziś – szczyt 7–22</div>
                <div className="stat__value">{todayRow?.peakAvg != null ? fmtNum(todayRow.peakAvg) : "–"}</div>
              </div>
              <div className="stat">
                <div className="stat__label">Średnia z 7 dni</div>
                <div className="stat__value">{weekAvg != null ? fmtNum(weekAvg) : "–"}</div>
              </div>
            </div>
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Doba</th>
                    <th>Średnia</th>
                    <th>Szczyt 7–22</th>
                    <th>Min</th>
                    <th>Max</th>
                  </tr>
                </thead>
                <tbody>
                  {market.slice(0, 14).map((m) => (
                    <tr key={m.day}>
                      <td>
                        {fmtDate(m.day)}
                        {m.day === plDay(now, 1) && <span className="badge badge--info" style={{ marginLeft: 8 }}>jutro</span>}
                      </td>
                      <td>
                        <strong>{fmtNum(m.avg)}</strong>
                      </td>
                      <td>{m.peakAvg != null ? fmtNum(m.peakAvg) : "–"}</td>
                      <td>{fmtNum(m.min)}</td>
                      <td>{fmtNum(m.max)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <p className="muted">Brak pobranych cen. Kliknij „Pobierz ceny teraz”.</p>
        )}
      </div>

      <div className="panel">
        <div className="panel__head">
          <h2>Porównanie aktualnych cenników ({items.length})</h2>
        </div>
        <form className="filters" method="get" action="/admin/ceny/">
          <div className="field">
            <label htmlFor="f-media">Media</label>
            <select id="f-media" className="select" name="media" defaultValue={media}>
              <option value="">Wszystkie</option>
              <option value="PRAD">Prąd</option>
              <option value="GAZ">Gaz</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="f-rok">Rok</label>
            <select id="f-rok" className="select" name="rok" defaultValue={sp.rok ?? ""}>
              <option value="">Wszystkie</option>
              {years.map((y) => (
                <option key={y}>{y}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="f-taryfa">Taryfa</label>
            <select id="f-taryfa" className="select" name="taryfa" defaultValue={sp.taryfa ?? ""}>
              <option value="">Wszystkie</option>
              {tariffs.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </div>
          <div className="field" style={{ alignSelf: "end" }}>
            <button className="btn btn--sm" type="submit">
              Filtruj
            </button>
          </div>
        </form>
        {items.length ? (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Sprzedawca</th>
                  <th>Produkt</th>
                  <th>Taryfa</th>
                  <th>Rok</th>
                  <th>Cena zł/MWh</th>
                  <th>Opłata handlowa</th>
                  <th>Ważny do</th>
                </tr>
              </thead>
              <tbody>
                {items.map((i) => (
                  <tr key={i.id}>
                    <td>
                      <Link className="row-link" href={`/admin/ceny/${i.priceList.id}/`}>
                        {i.priceList.supplier}
                      </Link>
                      <div className="muted small">{i.media === "GAZ" ? "Gaz" : "Prąd"}</div>
                    </td>
                    <td>
                      {i.product}
                      {i.note && <div className="muted small">{i.note}</div>}
                    </td>
                    <td>{i.tariff ?? "–"}</td>
                    <td>{i.year ?? "–"}</td>
                    <td>
                      <strong>{fmtNum(i.price)}</strong>
                      {(groupSize.get(groupKey(i)) ?? 0) > 1 && best.get(groupKey(i)) === i.price && (
                        <span className="badge badge--ok" style={{ marginLeft: 8 }}>
                          najniższa
                        </span>
                      )}
                    </td>
                    <td>{i.tradeFee != null ? `${fmtNum(i.tradeFee)} zł/mies.` : "–"}</td>
                    <td>{fmtDate(i.priceList.validTo)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="muted">Brak obowiązujących cenników{media || sp.rok || sp.taryfa ? " dla wybranych filtrów" : ""}. Dodaj cennik poniżej.</p>
        )}
      </div>

      <div className="two-col">
        <div className="panel">
          <div className="panel__head">
            <h2>Dodaj cennik sprzedawcy</h2>
          </div>
          <PriceListForm defaultFrom={plDay()} defaultTo={plDay(now, 6)} />
        </div>
        <div className="panel">
          <div className="panel__head">
            <h2>Cenniki ({lists.length})</h2>
          </div>
          {lists.length ? (
            <ul className="side-list">
              {lists.map((l) => {
                const st = priceListStatus(l, now);
                return (
                  <li key={l.id}>
                    <Link href={`/admin/ceny/${l.id}/`}>
                      <span>
                        <strong>{l.supplier}</strong> {l.name && <span className="muted">· {l.name}</span>}
                        <br />
                        <span className="muted small">
                          {fmtDate(l.validFrom)} – {l.validTo ? fmtDate(l.validTo) : "bezterminowo"} · {l._count.items} pozycji
                        </span>
                      </span>
                      <span className={`badge ${STATUS[st].cls}`}>{st === "PRZYSZLY" ? `Od ${fmtDate(l.validFrom)}` : STATUS[st].label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="muted">Nie dodano jeszcze żadnego cennika.</p>
          )}
        </div>
      </div>
    </>
  );
}
