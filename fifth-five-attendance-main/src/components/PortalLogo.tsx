"use client";

import { useEffect, useState } from "react";
import BrandMark from "./BrandMark";

type Props = { className?: string; size?: number; fallback?: React.ReactNode };

export default function PortalLogo({ className = "", size = 42, fallback }: Props) {
  const [logo, setLogo] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setLogo(d?.settings?.portalLogoUrl || null))
      .catch(() => {});
  }, []);

  if (!logo) return fallback ? <>{fallback}</> : <BrandMark />;

  return (
    <span className={`portal-logo ${className}`} style={{ width: size, height: size }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={logo} alt="Portal logo" />
    </span>
  );
}
