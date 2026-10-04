"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function StudentScanPage() {
  const [token, setToken] = useState("");
  const [state, setState] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("Scan the classroom QR with your phone camera. The scanned link will open this page automatically.");

  useEffect(() => {
    const value = new URLSearchParams(window.location.search).get("token") || "";
    setToken(value);
    if (value) submit(value);
  }, []);

  async function submit(value = token) {
    if (!value) { setState("error"); setMessage("No attendance QR was detected. Scan the live QR displayed by your CR."); return; }
    setState("loading");
    const response = await fetch("/api/attendance/qr/scan", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token: value }) });
    const data = await response.json();
    if (!response.ok) { setState("error"); setMessage(data.error || "Could not record attendance."); return; }
    setState("success");
    setMessage(data.alreadyMarked ? `Attendance already recorded for ${data.subject}.` : `Attendance recorded as PRESENT for ${data.subject}.`);
  }

  return (
    <main className="pro-page">
      <section className="pro-hero compact">
        <div><div className="eyebrow">FAST ATTENDANCE</div><h1>Scan attendance.</h1><p>Use your phone camera to scan the live QR displayed by your CR.</p></div>
      </section>
      <section className={`pro-card qr-scan-card ${state}`}>
        <div className="qr-scan-icon">{state === "success" ? "✓" : state === "error" ? "!" : "⌗"}</div>
        <h2>{state === "success" ? "Attendance confirmed" : state === "loading" ? "Checking QR…" : state === "error" ? "Scan not accepted" : "Ready to scan"}</h2>
        <p>{message}</p>
        {!token && <div className="qr-manual"><input value={token} onChange={(e) => setToken(e.target.value)} placeholder="QR token (only if needed)" /><button className="pro-button" onClick={() => submit()}>Confirm</button></div>}
        <Link className="pro-button secondary" href="/portal">Back to Student Portal</Link>
      </section>
    </main>
  );
}
