import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { RegisterForm } from "./RegisterForm";

export const metadata: Metadata = { title: "Załóż darmowe konto – portal Energia Online" };

export default async function RegisterPage() {
  const user = await getCurrentUser();
  if (user) redirect(user.role === "ADMIN" ? "/admin/" : "/portal/wniosek/");
  return (
    <>
      <h1>Załóż darmowe konto</h1>
      <p className="muted" style={{ marginBottom: 32 }}>
        Zajmie to minutę. Następnie wypełnisz wniosek o ofertę lub prześlesz fakturę.
      </p>
      <RegisterForm />
    </>
  );
}
