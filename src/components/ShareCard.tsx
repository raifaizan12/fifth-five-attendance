"use client";

import { useRef } from "react";

type CardData = {
  fullName: string;
  iubId: string;
  percentage: number;
  rank: number;
  totalStudents: number;
  streak: number;
};

// Draws a shareable "attendance card" (1080x1350 — story-ratio) on an
// off-screen canvas and triggers a PNG download. No server round-trip,
// no extra dependency — just the Canvas API.
export default function ShareCard({ data }: { data: CardData }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  function draw() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const W = 1080, H = 1350;
    canvas.width = W;
    canvas.height = H;

    // Background
    const bg = ctx.createLinearGradient(0, 0, W, H);
    bg.addColorStop(0, "#060b14");
    bg.addColorStop(1, "#0a1120");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    const glow1 = ctx.createRadialGradient(140, 80, 0, 140, 80, 620);
    glow1.addColorStop(0, "rgba(34,211,238,0.28)");
    glow1.addColorStop(1, "rgba(34,211,238,0)");
    ctx.fillStyle = glow1;
    ctx.fillRect(0, 0, W, H);

    const glow2 = ctx.createRadialGradient(W - 120, 200, 0, W - 120, 200, 560);
    glow2.addColorStop(0, "rgba(251,191,36,0.2)");
    glow2.addColorStop(1, "rgba(251,191,36,0)");
    ctx.fillStyle = glow2;
    ctx.fillRect(0, 0, W, H);

    // Glass card panel
    const pad = 64;
    roundRect(ctx, pad, 200, W - pad * 2, H - 200 - pad, 40);
    ctx.fillStyle = "rgba(18,30,48,0.72)";
    ctx.fill();
    ctx.strokeStyle = "rgba(126,171,204,0.25)";
    ctx.lineWidth = 2;
    ctx.stroke();

    // Brand mark
    ctx.save();
    const markX = pad + 60, markY = 130, markR = 34;
    const markGrad = ctx.createLinearGradient(markX - markR, markY - markR, markX + markR, markY + markR);
    markGrad.addColorStop(0, "#22d3ee");
    markGrad.addColorStop(1, "#fbbf24");
    roundRect(ctx, markX - markR, markY - markR, markR * 2, markR * 2, 18);
    ctx.fillStyle = markGrad;
    ctx.fill();
    ctx.strokeStyle = "#04121a";
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.moveTo(markX - 15, markY + 2);
    ctx.lineTo(markX - 3, markY + 15);
    ctx.lineTo(markX + 18, markY - 12);
    ctx.stroke();
    ctx.restore();

    ctx.fillStyle = "#e6edf5";
    ctx.font = "700 34px Sora, sans-serif";
    ctx.textBaseline = "middle";
    ctx.fillText("5th-5M Attendance Portal", markX + 56, markY - 6);
    ctx.fillStyle = "#5e7290";
    ctx.font = "500 24px 'IBM Plex Sans', sans-serif";
    ctx.fillText("BS IT · The Islamia University of Bahawalpur", markX + 56, markY + 30);

    let y = 300;

    // Name
    ctx.fillStyle = "#e6edf5";
    ctx.font = "800 58px Sora, sans-serif";
    ctx.fillText(data.fullName, pad + 56, y);
    y += 50;
    ctx.fillStyle = "#9db0c6";
    ctx.font = "600 30px 'JetBrains Mono', monospace";
    ctx.fillText(data.iubId, pad + 56, y);
    y += 90;

    // Big percentage
    ctx.fillStyle = data.percentage >= 75 ? "#7de8f7" : "#fb7185";
    ctx.font = "800 220px Sora, sans-serif";
    ctx.fillText(`${data.percentage}%`, pad + 48, y + 130);
    y += 280;

    ctx.fillStyle = "#5e7290";
    ctx.font = "600 28px 'IBM Plex Sans', sans-serif";
    ctx.fillText("OVERALL ATTENDANCE", pad + 56, y);
    y += 90;

    // Stat chips: rank + streak
    drawChip(ctx, pad + 56, y, rankMedal(data.rank) + `  Rank #${data.rank} of ${data.totalStudents}`, "#22d3ee");
    y += 90;
    if (data.streak > 0) {
      drawChip(ctx, pad + 56, y, `🔥  ${data.streak} class streak`, "#fbbf24");
      y += 90;
    }

    // Footer
    ctx.fillStyle = "#5e7290";
    ctx.font = "500 24px 'IBM Plex Sans', sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }), W / 2, H - 48);
    ctx.textAlign = "left";
  }

  function download() {
    draw();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = `attendance-${data.iubId}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  }

  return (
    <>
      <button className="btn btn-secondary" onClick={download}>
        📸 Download my attendance card
      </button>
      <canvas ref={canvasRef} style={{ display: "none" }} />
    </>
  );
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawChip(ctx: CanvasRenderingContext2D, x: number, y: number, text: string, color: string) {
  ctx.font = "700 32px 'IBM Plex Sans', sans-serif";
  const width = ctx.measureText(text).width + 56;
  roundRect(ctx, x, y - 44, width, 64, 32);
  ctx.fillStyle = color + "22";
  ctx.fill();
  ctx.strokeStyle = color + "66";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = color;
  ctx.textBaseline = "middle";
  ctx.fillText(text, x + 28, y - 12);
}

function rankMedal(rank: number) {
  if (rank === 1) return "🥇";
  if (rank === 2) return "🥈";
  if (rank === 3) return "🥉";
  return "🎯";
}
