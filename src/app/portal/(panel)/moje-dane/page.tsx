import Link from "next/link";
import { requireClient } from "@/lib/auth";
import { db } from "@/lib/db";
import { companyDraft, pointDrafts } from "@/lib/drafts";
import { PageHead } from "@/components/app/ui";
import { CompanyForm } from "@/components/app/CompanyForm";

export const metadata = { title: "Dane firmy" };

export default async function MyDataPage() {
  const user = await requireClient();
  const [companies, me] = await Promise.all([
    db.company.findMany({ where: { ownerId: user.id }, include: { points: { orderBy: { createdAt: "asc" } } }, orderBy: { createdAt: "asc" } }),
    db.user.findUniqueOrThrow({ where: { id: user.id }, select: { email: true, name: true, phone: true, marketingConsent: true } }),
  ]);
  return (
    <>
      <PageHead title="Dane firmy" sub="Dane firmy, osoby kontaktowej i liczników (PPE/PPG). Dane konta i zgody zmienisz w Ustawieniach konta." />
      <div className="stack">
        {companies.length === 0 && (
          <div className="panel">
            <p style={{ margin: 0 }}>
              Dane firmy pojawią się po złożeniu pierwszego zamówienia. <Link href="/portal/wniosek/">Generator ofert</Link>
            </p>
          </div>
        )}
        {companies.map((c) => (
          <CompanyForm key={c.id} company={companyDraft(c, me)} points={pointDrafts(c.points)} mode="client" />
        ))}
      </div>
    </>
  );
}
