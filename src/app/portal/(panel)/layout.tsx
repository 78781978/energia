import type { Metadata } from "next";
import Link from "next/link";
import { AppShell } from "@/components/app/AppShell";
import { requireClient } from "@/lib/auth";
import { db } from "@/lib/db";

export const metadata: Metadata = { title: { default: "Panel klienta", template: "%s | Energia Online" }, robots: { index: false, follow: false } };

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const user = await requireClient();
  const [unread, waiting] = await Promise.all([
    db.message.count({ where: { recipientId: user.id, readAt: null } }),
    db.application.count({ where: { userId: user.id, status: "OCZEKUJE_NA_PODPIS" } }),
  ]);
  return (
    <AppShell
      logo="/brand/logo-online.png"
      user={{ email: user.email, name: user.name, roleLabel: "Klient" }}
      nav={[
        { href: "/portal/", label: "Pulpit", icon: "home", exact: true, count: unread },
        { href: "/portal/wnioski/", label: "Moje wnioski", icon: "list", count: waiting },
        { href: "/portal/wniosek/", label: "Nowy wniosek", icon: "plus" },
        { href: "/portal/dokumenty/", label: "Dokumenty", icon: "file" },
        { href: "/portal/moje-dane/", label: "Moje dane", icon: "building" },
      ]}
      footer={
        <Link href="/kontakt/?typ=rozmowa" className="card card--flat card--pad-sm" style={{ textDecoration: "none", color: "inherit", display: "flex", gap: 12, alignItems: "center", padding: 14 }}>
          <img src="/img/3d/iskra.png" alt="" width={40} height={48} style={{ width: 40 }} />
          <span className="small">
            <strong style={{ display: "block" }}>Potrzebujesz pomocy?</strong>
            Zamów rozmowę z doradcą
          </span>
        </Link>
      }
    >
      {children}
    </AppShell>
  );
}
