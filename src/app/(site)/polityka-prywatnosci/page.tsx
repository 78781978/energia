import type { Metadata } from "next";
import { LegalDocument } from "@/components/site/LegalDocument";
import { PRIVACY_POLICY } from "@/content/prawne";

export const metadata: Metadata = {
  title: "Polityka prywatności i ochrony danych osobowych",
  description: "Zasady przetwarzania i ochrony danych osobowych w portalu Energia w Biznesie | Energia Online: administrator, cele, podstawy prawne, okresy przechowywania i prawa osób.",
  alternates: { canonical: "/polityka-prywatnosci/" },
};

export default function PrivacyPage() {
  return (
    <LegalDocument
      doc={PRIVACY_POLICY}
      title="Polityka prywatności i ochrony danych osobowych"
      path="/polityka-prywatnosci/"
      subtitle={PRIVACY_POLICY.intro.slice(1)}
    />
  );
}
