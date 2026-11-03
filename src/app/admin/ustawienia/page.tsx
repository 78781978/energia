import { requireAdmin } from "@/lib/auth";
import { getSiteSettings } from "@/lib/cms";
import { PageHead } from "@/components/app/ui";
import { SiteSettingsForm } from "@/components/app/CmsForms";

export const metadata = { title: "Dane firmy" };

export default async function SettingsPage() {
  await requireAdmin();
  const st = await getSiteSettings();
  return (
    <>
      <PageHead title="Dane firmy" sub="Dane widoczne w stopce, na stronie kontaktu, w polityce prywatności i regulaminie oraz w danych dla Google." />
      <SiteSettingsForm data={st} />
    </>
  );
}
