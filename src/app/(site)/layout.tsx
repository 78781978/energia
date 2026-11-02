import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { HelpWidget } from "@/components/site/HelpWidget";
import { CookieBar } from "@/components/site/CookieBar";
import { CATEGORIES } from "@/lib/content";
import { SITE } from "@/lib/site";
import { JsonLd, organizationLd } from "@/components/site/JsonLd";

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  const nav = CATEGORIES.map(({ slug, name, icon, services }) => ({ slug, name, icon, services }));
  return (
    <>
      <a className="skip-link" href="#tresc">
        Przejdź do treści
      </a>
      <SiteHeader categories={nav} />
      <main id="tresc">{children}</main>
      <SiteFooter />
      <HelpWidget phone={SITE.phone} />
      <CookieBar />
      <JsonLd data={organizationLd()} />
    </>
  );
}
