"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { signOut } from "next-auth/react";

const TABS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/attendance", label: "Mark Attendance" },
  { href: "/students", label: "Students" },
  { href: "/subjects", label: "Subjects" },
  { href: "/reports", label: "Reports" },
  { href: "/audit", label: "Audit Log" },
  { href: "/backup", label: "Backup" },
  { href: "/settings", label: "Settings" },
];

export default function CrShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div>
      <div className="topbar">
        <div className="topbar-inner">
          <div>
            <h1>Fifth Five Attendance Portal</h1>
            <div className="sub">CR Dashboard · BS IT · IUB</div>
          </div>
          <button className="logout-btn" onClick={() => signOut({ callbackUrl: "/login" })}>
            Log out
          </button>
        </div>
      </div>
      <div className="nav-tabs">
        {TABS.map((t) => (
          <Link key={t.href} href={t.href} className={`nav-tab ${pathname?.startsWith(t.href) ? "active" : ""}`}>
            {t.label}
          </Link>
        ))}
      </div>
      <div className="page">{children}</div>
    </div>
  );
}
