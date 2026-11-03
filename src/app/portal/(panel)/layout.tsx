import type { Metadata } from "next";
import Link from "next/link";
import { AppShell } from "@/components/app/AppShell";
import { VerifyNotice } from "@/components/app/VerifyNotice";
import { requireClient } from "@/lib/auth";
import { db } from "@/lib/db";
import { mediaUrl } from "@/lib/storage";

export const metadata: Metadata = { title: { default: "Portal Klienta", template: "%s | Energia Online" }, robots: { index: false, follow: false } };

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const user = await requireClient();
  const [unread, waiting] = await Promise.all([
    db.message.count({ where: { recipientId: user.id, readAt: null } }),
    db.application.count({ where: { userId: user.id, status: "OCZEKUJE_NA_PODPIS" } }),
  ]);
  return (
    <AppShell
      logo="/brand/logo-online.png"
      user={{ email: user.email, name: user.name, roleLabel: "Klient biznesowy", avatar: user.avatarStoredName ? mediaUrl(user.avatarStoredName) : null }}
      nav={[
        { href: "/portal/", label: "Pulpit", icon: "home", exact: true, count: unread },
        { href: "/portal/wniosek/", label: "Generator ofert", icon: "plus" },
        { href: "/portal/wnioski/", label: "Zamówienia", icon: "list", count: waiting },
        { href: "/portal/liczniki/", label: "Liczniki i umowy", icon: "bolt" },
        { href: "/portal/dokumenty/", label: "Umowy i dokumenty", icon: "file" },
        { href: "/portal/moje-dane/", label: "Dane firmy", icon: "building" },
        { href: "/portal/konto/", label: "Ustawienia konta", icon: "settings" },
      ]}
      footer={
        <Link href="/portal/?zapytanie=ROZMOWA#zapytanie" className="card card--flat card--pad-sm" style={{ textDecoration: "none", color: "inherit", display: "flex", gap: 12, alignItems: "center", padding: 14 }}>
          <img src="/img/3d/iskra.png" alt="" width={40} height={48} style={{ width: 40 }} />
          <span className="small">
            <strong style={{ display: "block" }}>Kontakt z ekspertem</strong>
            Zadaj pytanie lub zamów rozmowę
          </span>
        </Link>
      }
    >
      {!user.emailVerifiedAt && <VerifyNotice email={user.email} />}
      {children}
    </AppShell>
  );
}
