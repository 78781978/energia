import { requireClient } from "@/lib/auth";
import { db } from "@/lib/db";
import { purchaseYears } from "@/lib/constants";
import { companyDraft, pointDrafts } from "@/lib/drafts";
import { PageHead } from "@/components/app/ui";
import { ApplicationWizard } from "./ApplicationWizard";

export const metadata = { title: "Nowy wniosek o ofertę" };

export default async function NewApplicationPage({ searchParams }: { searchParams: Promise<{ nowe?: string }> }) {
  const user = await requireClient();
  const sp = await searchParams;
  const company = await db.company.findFirst({ where: { ownerId: user.id }, orderBy: { updatedAt: "desc" }, include: { points: true } });
  // Kolejne lata zakupu: od przyszłego roku (w IV kwartale) lub od bieżącego
  const now = new Date();
  const years = purchaseYears(now.getMonth() >= 9 ? new Date(now.getFullYear() + 1, 0, 1) : now);
  return (
    <>
      <PageHead title="Wniosek o ofertę" sub="Wybierz media i okres zakupu, podaj dane lub prześlij fakturę – resztą zajmie się doradca." />
      <ApplicationWizard company={companyDraft(company, user)} points={pointDrafts(company?.points ?? [])} years={years} isNew={sp.nowe === "1"} />
    </>
  );
}
