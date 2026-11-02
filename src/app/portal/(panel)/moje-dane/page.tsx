import Link from "next/link";
import { requireClient } from "@/lib/auth";
import { db } from "@/lib/db";
import { companyDraft, pointDrafts } from "@/lib/drafts";
import { PageHead } from "@/components/app/ui";
import { CompanyForm } from "@/components/app/CompanyForm";
import { AccountForm } from "./AccountForm";

export const metadata = { title: "Moje dane" };

export default async function MyDataPage() {
  const user = await requireClient();
  const [companies, me] = await Promise.all([
    db.company.findMany({ where: { ownerId: user.id }, include: { points: { orderBy: { createdAt: "asc" } } }, orderBy: { createdAt: "asc" } }),
    db.user.findUniqueOrThrow({ where: { id: user.id }, select: { email: true, name: true, phone: true, marketingConsent: true } }),
  ]);
  return (
    <>
      <PageHead title="Moje dane" sub="Dane firmy, osoby kontaktowej i punktów poboru energii." />
      <div className="stack">
        {companies.length === 0 && (
          <div className="panel">
            <p style={{ margin: 0 }}>
              Dane firmy pojawią się po złożeniu pierwszego wniosku. <Link href="/portal/wniosek/">Wypełnij wniosek</Link>
            </p>
          </div>
        )}
        {companies.map((c) => (
          <CompanyForm key={c.id} company={companyDraft(c, me)} points={pointDrafts(c.points)} mode="client" />
        ))}
        <AccountForm email={me.email} name={me.name} phone={me.phone} marketing={me.marketingConsent} />
      </div>
    </>
  );
}
