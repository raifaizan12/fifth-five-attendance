"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { useEffect } from "react";
import PortalLogo from "@/components/PortalLogo";
import BrandMark from "@/components/BrandMark";

type StudentSettings = {
  portalLogoUrl?: string | null;
  className?: string | null;
  university?: string | null;
  program?: string | null;
  semester?: string | null;
};

const items = [
  { href: "/portal", label: "Home", icon: "⌂" },
  { href: "/portal/analytics", label: "Analytics", icon: "◒" },
  { href: "/portal/schedule", label: "Schedule", icon: "▦" },
  { href: "/portal/notifications", label: "Alerts", icon: "♢" },
  { href: "/portal/requests", label: "Requests", icon: "＋" },
  { href: "/portal/scan", label: "Scan QR", icon: "⌗" },
];

export default function StudentNav({ settings }: { settings: StudentSettings | null }) {
  const p = usePathname();

  useEffect(() => {
    (async () => {
      try {
        if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;
        const reg = await navigator.serviceWorker.register("/sw.js");
        const key = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
        if (!key || Notification.permission === "denied") return;
        const permission = Notification.permission === "granted" ? "granted" : await Notification.requestPermission();
        if (permission !== "granted") return;
        const sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: Uint8Array.from(atob(key.replace(/-/g, "+").replace(/_/g, "/")), c => c.charCodeAt(0)),
        });
        await fetch("/api/push/subscribe", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            endpoint: sub.endpoint,
            keys: {
              p256dh: btoa(String.fromCharCode(...new Uint8Array(sub.getKey("p256dh")!))),
              auth: btoa(String.fromCharCode(...new Uint8Array(sub.getKey("auth")!))),
            },
          }),
        });
      } catch {}
    })();
  }, []);

  const className = settings?.className || "5TH-5M";
  const program = settings?.program || "BS Information Technology";
  const university = settings?.university || "The Islamia University of Bahawalpur";

  return (
    <>
      <header className="student-pro-topbar">
        <div className="student-pro-identity">
          <PortalLogo size={46} fallback={<BrandMark />} />
          <div>
            <div className="student-pro-brand">
              FIFTH FIVE <span>STUDENT PORTAL</span>
            </div>
            <div className="student-pro-sub">
              {program} · {className} · {university}
            </div>
          </div>
        </div>
        <button className="student-pro-logout" onClick={() => signOut({ callbackUrl: "/login" })}>
          Log out
        </button>
      </header>
      <nav className="student-pro-nav" aria-label="Student portal navigation">
        {items.map((x) => (
          <Link key={x.href} className={p === x.href ? "active" : ""} href={x.href}>
            <b>{x.icon}</b>
            <span>{x.label}</span>
          </Link>
        ))}
      </nav>
    </>
  );
}
