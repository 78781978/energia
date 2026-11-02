import Link from "next/link";
import { requireClient } from "@/lib/auth";
import { db } from "@/lib/db";
import { PageHead, StatusBadge, fmtDate } from "@/components/app/ui";
import { Icon } from "@/components/Icon";
import { MEDIA, PRICE_MODELS } from "@/lib/constants";

export const metadata = { title: "Moje wnioski" };

export default async function MyApplications() {
  const user = await requireClient();
  const apps = await db.application.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    include: { company: true, _count: { select: { points: true, documents: true } } },
  });
  return (
    <>
      <PageHead
        title="Moje wnioski"
        sub="Historia wniosków o ofertę i ich aktualne statusy."
        actions={
          <Link className="btn" href="/portal/wniosek/">
            <Icon name="plus" size={18} /> Nowy wniosek
          </Link>
        }
      />
      <div className="panel">
        {apps.length ? (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Numer</th>
                  <th>Firma</th>
                  <th>Media / model</th>
                  <th>Lata</th>
                  <th>PPE</th>
                  <th>Data</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {apps.map((a) => (
                  <tr key={a.id}>
                    <td>
                      <Link className="row-link" href={`/portal/wnioski/${a.id}/`}>
                        {a.number}
                      </Link>
                    </td>
                    <td>{a.company.name}</td>
                    <td>
                      {MEDIA[a.media as keyof typeof MEDIA]}
                      <div className="muted small">{PRICE_MODELS[a.priceModel as keyof typeof PRICE_MODELS]?.label}</div>
                    </td>
                    <td>{a.years.replace(/,/g, ", ")}</td>
                    <td>{a._count.points}</td>
                    <td>{fmtDate(a.createdAt)}</td>
                    <td>
                      <StatusBadge status={a.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty">
            <img src="/img/3d/brak-ofert.png" alt="" width={180} height={160} />
            <h3>Brak wniosków</h3>
            <p>Złóż pierwszy wniosek, aby otrzymać oferty.</p>
            <Link className="btn" href="/portal/wniosek/">
              Wypełnij wniosek
            </Link>
          </div>
        )}
      </div>
    </>
  );
}
