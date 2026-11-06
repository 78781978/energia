import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { PageHead, fmtDate, fmtDateTime, fmtPrice } from "@/components/app/ui";
import { Icon } from "@/components/Icon";
import { deletePriceList } from "@/app/actions/prices";
import { priceListStatus } from "@/lib/prices";

export const metadata = { title: "Cennik sprzedawcy" };
export const dynamic = "force-dynamic";

export default async function PriceListPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ zapisano?: string; pominiete?: string; zamkniete?: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const sp = await searchParams;
  const list = await db.priceList.findUnique({ where: { id }, include: { items: { orderBy: [{ media: "asc" }, { tariff: "asc" }, { zone: "asc" }, { year: "asc" }, { period: "asc" }] } } });
  if (!list) notFound();
  const author = list.createdById ? await db.user.findUnique({ where: { id: list.createdById }, select: { email: true, name: true } }) : null;
  const st = priceListStatus(list);
  const skipped = Number(sp.pominiete) || 0;
  const closed = Number(sp.zamkniete) || 0;
  const hasMax = list.items.some((i) => i.priceMax != null);
  const hasZone = list.items.some((i) => i.zone);
  const hasCode = list.items.some((i) => i.code);

  return (
    <>
      <PageHead
        title={`${list.supplier}${list.name ? ` – ${list.name}` : ""}${list.number ? ` (nr ${list.number})` : ""}`}
        sub={
          <>
            Obowiązuje {fmtDate(list.validFrom)} – {list.validTo ? fmtDate(list.validTo) : "bezterminowo"} ·{" "}
            {st === "AKTUALNY" ? "aktualny" : st === "PRZYSZLY" ? "jeszcze nie obowiązuje" : "archiwalny"} · tylko dla administratorów
          </>
        }
        actions={
          <Link className="btn btn--sm btn--secondary" href="/admin/ceny/">
            Wszystkie ceny
          </Link>
        }
      />
      {sp.zapisano && (
        <div className={`alert ${skipped ? "alert--warn" : "alert--ok"}`} style={{ marginBottom: 16 }}>
          <Icon name={skipped ? "alert" : "checkCircle"} />
          <p>
            Zapisano {sp.zapisano} pozycji cennika.
            {skipped > 0 && ` Pominięto ${skipped} wierszy – sprawdź tabelę poniżej i uwagi z importu.`}
            {closed > 0 && ` Poprzedni cennik tego sprzedawcy zakończono dzień przed początkiem nowego.`}
          </p>
        </div>
      )}
      <div className="panel">
        <div className="panel__head">
          <h2>Pozycje ({list.items.length})</h2>
        </div>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Media</th>
                <th>Taryfa</th>
                {hasZone && <th>Strefa</th>}
                <th>Okres</th>
                <th>{hasMax ? "Cena min." : "Cena"} zł/MWh</th>
                {hasMax && <th>Cena maks.</th>}
                <th>Opłata handlowa</th>
                {hasCode && <th>Kod produktu</th>}
                <th>Uwagi</th>
              </tr>
            </thead>
            <tbody>
              {list.items.map((i) => (
                <tr key={i.id}>
                  <td>{i.media === "GAZ" ? "Gaz" : "Prąd"}</td>
                  <td>{i.tariff ?? "–"}</td>
                  {hasZone && <td>{i.zone ?? "–"}</td>}
                  <td>
                    {i.year ?? "–"}
                    {i.period && <div className="muted small">{i.period}</div>}
                  </td>
                  <td>
                    <strong>{fmtPrice(i.price)}</strong>
                  </td>
                  {hasMax && <td>{i.priceMax != null ? fmtPrice(i.priceMax) : "–"}</td>}
                  <td>{i.tradeFee != null ? `${fmtPrice(i.tradeFee)} zł/mies.` : "–"}</td>
                  {hasCode && <td className="small">{i.code ?? ""}</td>}
                  <td className="muted small">{i.note ?? ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {list.conditions && (
        <div className="panel">
          <div className="panel__head">
            <h2>Warunki sprzedawcy (z cennika)</h2>
          </div>
          <ul className="small" style={{ margin: 0, paddingLeft: 20, display: "grid", gap: 4 }}>
            {list.conditions.split("\n").map((c, i) => (
              <li key={i}>{c}</li>
            ))}
          </ul>
        </div>
      )}
      <div className="two-col">
        <div className="panel">
          <div className="panel__head">
            <h2>Informacje</h2>
          </div>
          <dl className="dl">
            <dt>Dodano</dt>
            <dd>
              {fmtDateTime(list.createdAt)}
              {author && ` · ${author.name ?? author.email}`}
            </dd>
            {list.note && (
              <>
                <dt>Uwagi</dt>
                <dd style={{ whiteSpace: "pre-line" }}>{list.note}</dd>
              </>
            )}
            {list.documentId && (
              <>
                <dt>Oryginał</dt>
                <dd>
                  <a className="link-arrow" href={`/api/pliki/${list.documentId}?podglad=1`} target="_blank" rel="noreferrer">
                    Otwórz PDF <Icon name="arrowRight" size={16} />
                  </a>
                </dd>
              </>
            )}
          </dl>
        </div>
        <div className="panel">
          <div className="panel__head">
            <h2>Usuń cennik</h2>
          </div>
          <p className="muted small">Usunięcie jest nieodwracalne. Oferty przypisane klientom nie zmienią się.</p>
          <form action={deletePriceList}>
            <input type="hidden" name="id" value={list.id} />
            <button className="btn btn--sm btn--danger" type="submit">
              Usuń cennik
            </button>
          </form>
        </div>
      </div>
    </>
  );
}
