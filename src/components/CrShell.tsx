"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { signOut } from "next-auth/react";
import BrandMark from "./BrandMark";

const ICONS: Record<string, React.ReactNode> = {
  "/dashboard": <path d="M4 13h6V4H4v9Zm0 7h6v-5H4v5Zm10 0h6V11h-6v9Zm0-16v5h6V4h-6Z" />,
  "/attendance": <path d="M9 11l3 3 5-5M20 12a8 8 0 1 1-8-8 8 8 0 0 1 8 8Z" />,
  "/students": <path d="M16 11a4 4 0 1 0-4-4 4 4 0 0 0 4 4Zm-8 1a3.5 3.5 0 1 0-3.5-3.5A3.5 3.5 0 0 0 8 12Zm8 2c-3.3 0-8 1.34-8 4v3h16v-3c0-2.66-4.7-4-8-4Zm-8 1.2c-2.9.42-5 1.6-5 2.8v2h5" />,
  "/subjects": <path d="M4 19.5V5a2 2 0 0 1 2-2h11a1 1 0 0 1 1 1v14M6 3h12M6 21h13" />,
  "/reports": <path d="M4 20V10m6 10V4m6 16v-7" />,
  "/audit": <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2M9 13h6M9 17h6" />,
  "/backup": <path d="M12 3v12m0 0-4-4m4 4 4-4M5 19h14" />,
  "/settings": <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm8-3a8 8 0 0 0-.2-1.8l2-1.6-2-3.4-2.3.9a7.9 7.9 0 0 0-3-1.7L14 2h-4l-.5 2.4a7.9 7.9 0 0 0-3 1.7l-2.3-.9-2 3.4 2 1.6a8 8 0 0 0 0 3.6l-2 1.6 2 3.4 2.3-.9a7.9 7.9 0 0 0 3 1.7L10 22h4l.5-2.4a7.9 7.9 0 0 0 3-1.7l2.3.9 2-3.4-2-1.6A8 8 0 0 0 20 12Z" />,
};

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
            <BrandMark />
            <div>
              <h1>5th-5M Attendance Portal</h1>
              <div className="sub">CR Dashboard · BS IT · IUB</div>
            </div>
          </div>
          <button className="logout-btn" onClick={() => signOut({ callbackUrl: "/login" })}>
            Log out
          </button>
        </div>
      </div>
      <div className="nav-tabs">
        {TABS.map((t) => (
          <Link key={t.href} href={t.href} className={`nav-tab ${pathname?.startsWith(t.href) ? "active" : ""}`}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              {ICONS[t.href]}
            </svg>
            {t.label}
          </Link>
        ))}
      </div>
      <div className="page">{children}</div>
    </div>
  );
}

