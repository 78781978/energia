import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = { title: "Logowanie – portal Energia Online" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; wylogowano?: string }> }) {
  const user = await getCurrentUser();
  if (user) redirect(user.role === "ADMIN" ? "/admin/" : "/portal/");
  const sp = await searchParams;
  return (
    <>
      <h1>Witaj ponownie</h1>
      <p className="muted" style={{ marginBottom: 32 }}>
        Zaloguj się do swojego panelu.
      </p>
      <LoginForm next={sp.next ?? ""} loggedOut={sp.wylogowano === "1"} />
    </>
  );
}
