import type { Metadata } from "next";
import { TwoFactorForm } from "./TwoFactorForm";

export const metadata: Metadata = { title: "Kod logowania – portal Energia Online" };

export default function TwoFactorPage() {
  return (
    <>
      <h1>Logowanie dwuetapowe</h1>
      <p className="muted" style={{ marginBottom: 32 }}>
        Wpisz 6-cyfrowy kod z aplikacji uwierzytelniającej (np. Google Authenticator, Microsoft Authenticator) albo jeden z kodów zapasowych.
      </p>
      <TwoFactorForm />
    </>
  );
}
