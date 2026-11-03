import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { HelpWidget } from "@/components/site/HelpWidget";
import { CookieBar } from "@/components/site/CookieBar";
import { CATEGORIES } from "@/lib/content";
import { getSiteSettings } from "@/lib/cms";
import { JsonLd, organizationLd } from "@/components/site/JsonLd";

// Odświeżanie stron po zmianach w panelu (Treści) – najpóźniej co 5 minut, a po zapisie od razu.
export const revalidate = 300;

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const st = await getSiteSettings();
  const nav = CATEGORIES.map(({ slug, name, icon, services }) => ({ slug, name, icon, services }));
  return (
    <>
      <a className="skip-link" href="#tresc">
        Przejdź do treści
      </a>
      <SiteHeader categories={nav} />
      <main id="tresc">{children}</main>
      <SiteFooter />
      <HelpWidget phone={st.phone} />
      <CookieBar />
      <JsonLd data={organizationLd(st)} />
    </>
  );
}
