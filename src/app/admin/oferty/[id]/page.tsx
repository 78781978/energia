import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { PageHead, StatusBadge, fmtNum } from "@/components/app/ui";
import { OfferForm } from "@/components/app/AdminForms";
import { OFFER_ASSIGNMENT_STATUS } from "@/lib/constants";

export const metadata = { title: "Edycja oferty" };

export default async function OfferEdit({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const o = await db.offer.findUnique({
    where: { id },
    include: { document: true, assignments: { include: { application: { include: { company: { select: { name: true } } } } }, orderBy: { createdAt: "desc" } } },
  });
  if (!o) notFound();
  return (
    <>
      <p className="small" style={{ marginBottom: 8 }}>
        <Link href="/admin/oferty/">← Oferty</Link>
      </p>
      <PageHead title={o.name} sub={o.supplier} actions={o.document && <a className="btn btn--ghost btn--sm" href={`/api/pliki/${o.document.id}?podglad=1`} target="_blank" rel="noreferrer">Cennik PDF</a>} />
      <div className="two-col">
        <div className="panel">
          <OfferForm
            offer={{
              id: o.id,
              name: o.name,
              supplier: o.supplier,
              media: o.media,
              priceModel: o.priceModel,
              years: o.years,
              priceNetMWh: o.priceNetMWh,
              tradeFeeMonthly: o.tradeFeeMonthly,
              validUntil: o.validUntil ? o.validUntil.toISOString().slice(0, 10) : "",
              description: o.description ?? "",
              isActive: o.isActive,
              hasPdf: !!o.document,
            }}
          />
        </div>
        <div className="panel">
          <div className="panel__head">
            <h2>Przypisana do wniosków</h2>
          </div>
          <ul className="side-list">
            {o.assignments.map((a) => (
              <li key={a.id}>
                <Link href={`/admin/wnioski/${a.applicationId}/`} style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                  <span>
                    {a.application.number} · {a.application.company.name}
                    <span className="muted small"> · {fmtNum(a.customPriceNetMWh ?? o.priceNetMWh)} zł/MWh · {OFFER_ASSIGNMENT_STATUS[a.status as keyof typeof OFFER_ASSIGNMENT_STATUS]}</span>
                  </span>
                  <StatusBadge status={a.application.status} />
                </Link>
              </li>
            ))}
          </ul>
          {!o.assignments.length && <p className="muted small">Jeszcze nieprzypisana.</p>}
        </div>
      </div>
    </>
  );
}
