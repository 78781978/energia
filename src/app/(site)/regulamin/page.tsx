import type { Metadata } from "next";
import { LegalDocument } from "@/components/site/LegalDocument";
import { TERMS } from "@/content/prawne";

export const metadata: Metadata = {
  title: "Regulamin portalu Energia w Biznesie | Energia Online",
  description: "Regulamin świadczenia usług drogą elektroniczną, konta klienta, prezentowania ofert, zawierania umów sprzedaży energii elektrycznej i gazu oraz usług doradztwa energetycznego.",
  alternates: { canonical: "/regulamin/" },
};

export default function TermsPage() {
  return <LegalDocument doc={TERMS} title="Regulamin portalu Energia w Biznesie | Energia Online" path="/regulamin/" subtitle={TERMS.intro.slice(1)} />;
}
