import type { Metadata } from "next";
import { AppShell } from "@/components/app/AppShell";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";

export const metadata: Metadata = { title: { default: "Panel administratora", template: "%s | Admin Energia Online" }, robots: { index: false, follow: false } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdmin({ allowWithout2fa: true });
  const [newApps, newLeads] = await Promise.all([
    db.application.count({ where: { status: "WNIOSEK_UTWORZONY" } }),
    db.lead.count({ where: { status: "NOWE" } }),
  ]);
  return (
    <AppShell
      logo="/brand/logo-online.png"
      user={{ email: admin.email, name: admin.name, roleLabel: "Administrator" }}
      nav={[
        { href: "/admin/", label: "Wnioski", icon: "list", exact: true, count: newApps },
        { href: "/admin/klienci/", label: "Klienci", icon: "building" },
        { href: "/admin/oferty/", label: "Oferty i cenniki", icon: "tag" },
        { href: "/admin/zapytania/", label: "Zapytania", icon: "message", count: newLeads },
        { href: "/admin/tresci/", label: "Treści strony", icon: "file" },
        { href: "/admin/aktualnosci/", label: "Aktualności", icon: "message" },
        { href: "/admin/banery/", label: "Banery i grafiki", icon: "eye" },
        { href: "/admin/ustawienia/", label: "Dane firmy", icon: "settings" },
        { href: "/admin/analityka/", label: "Analityka", icon: "chart" },
        { href: "/admin/newsletter/", label: "Newsletter", icon: "mail" },
        { href: "/admin/zespol/", label: "Zespół", icon: "users" },
        { href: "/admin/konto/", label: "Moje konto", icon: "lock" },
      ]}
    >
      {children}
    </AppShell>
  );
}
