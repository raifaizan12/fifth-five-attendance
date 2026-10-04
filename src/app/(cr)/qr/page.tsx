"use client";

import { useEffect, useMemo, useState } from "react";

type Subject = { id: string; name: string; teacherId?: string | null };
type ActiveSession = { id: string; subject: string; topic: string; expiresAt: string; scanUrl: string; token: string };

export default function QRPage() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [subjectId, setSubjectId] = useState("");
  const [topic, setTopic] = useState("");
  const [duration, setDuration] = useState("120");
  const [session, setSession] = useState<ActiveSession | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [presentCount, setPresentCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    fetch("/api/subjects")
      .then((r) => r.json())
      .then((data) => setSubjects(data.subjects || []))
      .catch(() => setMessage("Could not load subjects."));
  }, []);

  useEffect(() => {
    if (!session) return;
    const tick = () => {
      const left = Math.max(0, Math.ceil((new Date(session.expiresAt).getTime() - Date.now()) / 1000));
      setSecondsLeft(left);
      if (left === 0) setMessage("QR session expired. Start a new session for the next class.");
    };
    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [session]);

  useEffect(() => {
    if (!session) return;
    const refresh = async () => {
      try {
        const response = await fetch(`/api/attendance/qr/session/${session.id}`, { cache: "no-store" });
        if (!response.ok) return;
        const data = await response.json();
        setPresentCount(data.session?.present || 0);
        setTotalCount(data.session?.total || 0);
      } catch {}
    };
    refresh();
    const timer = window.setInterval(refresh, 3000);
    return () => window.clearInterval(timer);
  }, [session]);

  const qrUrl = useMemo(() => {
    if (!session?.scanUrl) return "";
    return `https://api.qrserver.com/v1/create-qr-code/?size=420x420&margin=12&data=${encodeURIComponent(session.scanUrl)}`;
  }, [session]);

  async function startSession() {
    if (!subjectId) return;
    setLoading(true);
    setMessage("");
    const response = await fetch("/api/attendance/qr/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subjectId, topic: topic.trim() || "QR Attendance", durationSeconds: Number(duration) }),
    });
    const data = await response.json();
    setLoading(false);
    if (!response.ok) {
      setMessage(data.error || "Could not start QR session.");
      return;
    }
    setSession(data.session);
    setPresentCount(0);
    setTotalCount(0);
    setMessage("Live QR session started. Students can scan the code with their phone camera.");
  }

  async function stopSession() {
    if (!session) return;
    await fetch(`/api/attendance/qr/session/${session.id}`, { method: "DELETE" });
    setSession(null);
    setSecondsLeft(0);
    setPresentCount(0);
    setTotalCount(0);
    setMessage("QR attendance session stopped.");
  }

  const mins = Math.floor(secondsLeft / 60).toString().padStart(2, "0");
  const secs = (secondsLeft % 60).toString().padStart(2, "0");

  return (
    <main className="pro-page">
      <div className="pro-hero compact">
        <div>
          <div className="eyebrow">FAST ATTENDANCE</div>
          <h1>QR attendance.</h1>
          <p>Start a short-lived live session. Students simply scan the QR with their phone camera.</p>
        </div>
      </div>

      {!session ? (
        <section className="pro-card qr-card">
          <div className="qr-form-grid">
            <label>Subject
              <select value={subjectId} onChange={(e) => setSubjectId(e.target.value)}>
                <option value="">Select subject</option>
                {subjects.map((subject) => <option key={subject.id} value={subject.id}>{subject.name}</option>)}
              </select>
            </label>
            <label>Session duration
              <select value={duration} onChange={(e) => setDuration(e.target.value)}>
                <option value="60">1 minute</option>
                <option value="120">2 minutes</option>
                <option value="180">3 minutes</option>
                <option value="300">5 minutes</option>
              </select>
            </label>
            <label className="qr-topic">Topic / lecture label (optional)
              <input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="e.g. Lecture 12 — Normalization" />
            </label>
          </div>
          <div className="qr-security-note">
            <strong>🔐 Secure session</strong>
            <span>The system creates a unique token automatically. No session ID needs to be pasted.</span>
          </div>
          <button className="pro-button" disabled={!subjectId || loading} onClick={startSession}>
            {loading ? "Starting session…" : "Start QR attendance"}
          </button>
          {message && <div className="hint" style={{ marginTop: 14 }}>{message}</div>}
        </section>
      ) : (
        <section className="pro-card qr-live-card">
          <div className="qr-live-head">
            <div>
              <span className="qr-live-pill"><i /> LIVE SESSION</span>
              <h2>{session.subject}</h2>
              <p>{session.topic} · Students scan this code to mark themselves present.</p>
            </div>
            <div className={`qr-countdown ${secondsLeft <= 20 ? "danger" : ""}`}>
              <small>EXPIRES IN</small>
              <strong>{mins}:{secs}</strong>
            </div>
          </div>
          <div className="qr-display">
            <div className="qr-frame">
              {qrUrl ? <img src={qrUrl} alt="Live attendance QR code" /> : null}
            </div>
            <div className="qr-instructions">
              <div className="qr-step"><b>1</b><span>Display this QR on the classroom screen.</span></div>
              <div className="qr-step"><b>2</b><span>Students open their phone camera and scan it.</span></div>
              <div className="qr-step"><b>3</b><span>The portal verifies the session and records PRESENT once.</span></div>
              <button className="pro-button danger-button" onClick={stopSession}>Stop session</button>
            </div>
          </div>
          <div className="qr-live-stats">
            <div><strong>{presentCount}</strong><span>Present</span></div>
            <div><strong>{totalCount}</strong><span>Scanned</span></div>
            <div><strong>{Math.max(0, totalCount - presentCount)}</strong><span>Not present</span></div>
          </div>
          <div className="qr-security-note">
            <strong>🔒 One-time student check</strong>
            <span>Expired or reused tokens are rejected automatically.</span>
          </div>
          {message && <div className="hint" style={{ marginTop: 14 }}>{message}</div>}
        </section>
      )}
    </main>
  );
}
