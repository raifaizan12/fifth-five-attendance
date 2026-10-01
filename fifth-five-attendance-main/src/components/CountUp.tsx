"use client";

import { useEffect, useRef, useState } from "react";

export default function CountUp({ value, suffix = "", duration = 900 }: { value: number; suffix?: string; duration?: number }) {
  const [display, setDisplay] = useState(0);
  const startRef = useRef<number | null>(null);
  const fromRef = useRef(0);

  useEffect(() => {
    fromRef.current = display;
    startRef.current = null;
    let raf: number;
    function tick(ts: number) {
      if (startRef.current === null) startRef.current = ts;
      const t = Math.min(1, (ts - startRef.current) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(fromRef.current + (value - fromRef.current) * eased);
      if (t < 1) raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, duration]);

  const rounded = Number.isInteger(value) ? Math.round(display) : Math.round(display * 10) / 10;
  return <>{rounded}{suffix}</>;
}
