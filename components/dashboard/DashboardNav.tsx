"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { CSSProperties, ReactNode } from "react";
import { Brand } from "@/components/ui/Brand";
import { C } from "@/components/dashboard/theme";

/** Single source of truth for the dashboard navigation. */
const NAV_ITEMS = [
  { href: "/dashboard", label: "Console" },
  { href: "/dashboard/groups", label: "Groups" },
  { href: "/dashboard/team", label: "Team" },
] as const;

function isActive(pathname: string, href: string): boolean {
  if (href === "/dashboard") return pathname === "/dashboard";
  return pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * Standardized top navigation shared by every dashboard surface (Console, Groups,
 * Team). Renders the brand + page title, the primary nav with an
 * active-route indicator, and an optional `right` slot for page-specific controls
 * (clock, account, save status).
 */
export function DashboardNav({
  title,
  subtitle,
  badge,
  brandSize = 28,
  brandPulse = false,
  right,
}: {
  title: string;
  subtitle?: string;
  badge?: string;
  brandSize?: number;
  brandPulse?: boolean;
  right?: ReactNode;
}) {
  const pathname = usePathname() ?? "";

  return (
    <header style={st.header}>
      <div style={st.brandWrap}>
        <Brand variant="dark" size={brandSize} pulse={brandPulse} />
        <div>
          <div style={st.titleRow}>
            <span style={st.title}>{title}</span>
            {badge && <span style={st.badge}>{badge}</span>}
          </div>
          {subtitle && <div style={st.sub}>{subtitle}</div>}
        </div>
      </div>

      <div style={st.right}>
        <nav style={st.nav} aria-label="Dashboard">
          {NAV_ITEMS.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                style={{ ...st.navLink, ...(active ? st.navLinkActive : null) }}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        {right && <div style={st.extras}>{right}</div>}
      </div>
    </header>
  );
}

const st: Record<string, CSSProperties> = {
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 20px", borderBottom: `1px solid ${C.border}`, background: `linear-gradient(180deg, ${C.panel}, ${C.panel2})`, gap: 16, flexWrap: "wrap" },
  brandWrap: { display: "flex", alignItems: "center", gap: 12 },
  titleRow: { display: "flex", alignItems: "center", gap: 9 },
  title: { fontSize: 15, fontWeight: 700 },
  badge: { fontSize: 10.5, color: C.muted, letterSpacing: "0.06em", textTransform: "uppercase", border: `1px solid ${C.borderSoft}`, borderRadius: 20, padding: "3px 9px" },
  sub: { fontSize: 12, color: C.muted, marginTop: 3 },
  right: { display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" },
  nav: { display: "flex", alignItems: "center", gap: 4 },
  navLink: { color: C.muted, textDecoration: "none", fontSize: 13, fontWeight: 600, padding: "6px 10px", borderRadius: 8, transition: "color 0.15s, background 0.15s" },
  navLinkActive: { color: C.text, background: C.raised },
  extras: { display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap", paddingLeft: 16, borderLeft: `1px solid ${C.borderSoft}` },
};
