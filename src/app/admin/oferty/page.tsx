import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { PageHead, fmtDate, fmtNum } from "@/components/app/ui";
import { OfferForm } from "@/components/app/AdminForms";
import { Icon } from "@/components/Icon";
import { MEDIA, PRICE_MODELS } from "@/lib/constants";

export const metadata = { title: "Oferty i cenniki" };

export default async function Offers({ searchParams }: { searchParams: Promise<{ zapisano?: string }> }) {
  await requireAdmin();
  const sp = await searchParams;
  const offers = await db.offer.findMany({
    orderBy: [{ isActive: "desc" }, { createdAt: "desc" }],
    include: { document: true, _count: { select: { assignments: true } }, assignments: { where: { status: "WYBRANA" }, select: { id: true } } },
  });
  return (
    <>
      <PageHead title="Oferty i cenniki" sub="Dodawaj oferty sprzedawców, aktualizuj ceny i przypisuj je do wniosków klientów." />
      {sp.zapisano && (
        <div className="alert alert--ok" style={{ marginBottom: 16 }}>
          <Icon name="checkCircle" />
          <p>Oferta została dodana.</p>
        </div>
      )}
      <div className="two-col">
        <div className="panel">
          <div className="panel__head">
            <h2>Oferty ({offers.length})</h2>
          </div>
          {offers.length ? (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Oferta</th>
                    <th>Model / lata</th>
                    <th>Cena</th>
                    <th>Ważna do</th>
                    <th>Przypisania</th>
                  </tr>
                </thead>
                <tbody>
                  {offers.map((o) => (
                    <tr key={o.id} style={o.isActive ? undefined : { opacity: 0.55 }}>
                      <td>
                        <Link className="row-link" href={`/admin/oferty/${o.id}/`}>
                          {o.name}
                        </Link>
                        <div className="muted small">
                          {o.supplier} · {MEDIA[o.media as keyof typeof MEDIA]} {o.document && "· cennik PDF"} {!o.isActive && "· nieaktywna"}
                        </div>
                      </td>
                      <td>
                        {PRICE_MODELS[o.priceModel as keyof typeof PRICE_MODELS]?.label}
                        <div className="muted small">{o.years.replace(/,/g, ", ")}</div>
                      </td>
                      <td>{o.priceNetMWh != null ? `${fmtNum(o.priceNetMWh)} zł/MWh` : "–"}</td>
                      <td>{fmtDate(o.validUntil)}</td>
                      <td>
                        {o._count.assignments}
                        {o.assignments.length > 0 && <span className="muted small"> ({o.assignments.length} wybr.)</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="muted">Nie dodano jeszcze żadnej oferty.</p>
          )}
        </div>
        <div className="panel">
          <div className="panel__head">
            <h2>Nowa oferta</h2>
          </div>
          <OfferForm />
        </div>
      </div>
    </>
  );
}
