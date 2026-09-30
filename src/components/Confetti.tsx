"use client";

import { useEffect, useRef } from "react";

const COLORS = ["#22d3ee", "#fbbf24", "#34d399", "#7de8f7", "#fcd98a"];

export default function Confetti({ fire }: { fire: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!fire) return;
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = window.innerWidth * dpr;
    canvas.height = window.innerHeight * dpr;
    ctx.scale(dpr, dpr);

    const pieces = Array.from({ length: 140 }, () => ({
      x: Math.random() * window.innerWidth,
      y: -20 - Math.random() * window.innerHeight * 0.3,
      w: 6 + Math.random() * 5,
      h: 8 + Math.random() * 6,
      rot: Math.random() * 360,
      vRot: -6 + Math.random() * 12,
      vy: 2.5 + Math.random() * 3,
      vx: -1.5 + Math.random() * 3,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
    }));

    let frame = 0;
    let raf: number;
    function draw() {
      ctx!.clearRect(0, 0, window.innerWidth, window.innerHeight);
      frame++;
      let alive = false;
      for (const p of pieces) {
        p.x += p.vx;
        p.y += p.vy;
        p.rot += p.vRot;
        if (p.y < window.innerHeight + 20) alive = true;
        ctx!.save();
        ctx!.translate(p.x, p.y);
        ctx!.rotate((p.rot * Math.PI) / 180);
        ctx!.fillStyle = p.color;
        ctx!.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx!.restore();
      }
      if (alive && frame < 260) raf = requestAnimationFrame(draw);
      else ctx!.clearRect(0, 0, window.innerWidth, window.innerHeight);
    }
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [fire]);

  if (!fire) return null;
  return (
    <canvas
      ref={ref}
      style={{ position: "fixed", inset: 0, width: "100vw", height: "100vh", pointerEvents: "none", zIndex: 60 }}
    />
  );
}
