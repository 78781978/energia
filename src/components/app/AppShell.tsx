"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Icon, type IconName } from "@/components/Icon";
import { logout } from "@/app/actions/auth";

export type NavItem = { href: string; label: string; icon: IconName; count?: number; exact?: boolean };

export function AppShell({
  nav,
  user,
  logo,
  children,
  footer,
}: {
  nav: NavItem[];
  user: { email: string; name: string | null; roleLabel: string; avatar?: string | null };
  logo: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [pathname]);
  const isActive = (n: NavItem) => (n.exact ? pathname === n.href : pathname.startsWith(n.href));
  const initials = (user.name || user.email)
    .split(/[\s@.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase())
    .join("");

  return (
    <div className="app-shell">
      <div className="app-topbar">
        <Link href={nav[0].href}>
          <img src={logo} alt="energia online" width={130} height={36} />
        </Link>
        <button type="button" className="btn btn--ghost btn--sm" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
          <Icon name={open ? "close" : "menu"} size={20} />
          <span className="sr-only">Menu</span>
        </button>
      </div>
      <aside className="app-sidebar" data-open={open}>
        <Link href={nav[0].href} className="app-sidebar__logo">
          <img src={logo} alt="energia online" width={150} height={41} />
        </Link>
        <nav className="app-nav" aria-label="Panel">
          {nav.map((n) => (
            <Link key={n.href} href={n.href} aria-current={isActive(n) ? "page" : undefined}>
              <Icon name={n.icon} size={20} />
              {n.label}
              {!!n.count && <span className="count">{n.count}</span>}
            </Link>
          ))}
        </nav>
        <div className="app-sidebar__foot">
          {footer}
          <div className="app-user">
            <span className="app-user__avatar" aria-hidden="true" style={user.avatar ? { background: "#fff", overflow: "hidden" } : undefined}>
              {user.avatar ? <img src={user.avatar} alt="" style={{ width: "100%", height: "100%", objectFit: "contain" }} /> : initials}
            </span>
            <div className="app-user__meta">
              <div style={{ fontWeight: 700 }}>{user.name || user.email}</div>
              <div className="muted small">{user.roleLabel}</div>
            </div>
          </div>
          <form action={logout}>
            <button type="submit" className="btn btn--ghost btn--sm btn--block">
              <Icon name="logout" size={18} /> Wyloguj się
            </button>
          </form>
        </div>
      </aside>
      <main className="app-main" id="tresc">
        {children}
      </main>
    </div>
  );
}
