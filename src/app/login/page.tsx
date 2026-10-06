"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [role, setRole] = useState<"ADMIN" | "STUDENT">("STUDENT");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const isCR = role === "ADMIN";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const res = await signIn("credentials", { identifier, password, redirect: false });
    setLoading(false);
    if (res?.error) {
      setError(res.error === "CredentialsSignin" ? "Invalid credentials. Please check and try again." : res.error);
      return;
    }
    router.push(isCR ? "/dashboard" : "/portal");
    router.refresh();
  }

  return (
    <main className={`auth-page ${isCR ? "auth-cr" : "auth-student"}`}>
      <div className="auth-noise" />
      <section className="auth-layout">
        <aside className="auth-visual">
          <div className="auth-visual-top">
            <div className="auth-logo"><span>5</span></div>
            <div><b>FIFTH FIVE</b><small>ATTENDANCE PLATFORM</small></div>
          </div>

          <div className="auth-visual-main">
            <div className="auth-status"><i /> {isCR ? "CLASS REPRESENTATIVE WORKSPACE" : "STUDENT ACADEMIC HUB"}</div>
            <h2>{isCR ? "Run your class with confidence." : "Your academic day, beautifully organized."}</h2>
            <p>{isCR ? "Attendance, schedules, students, QR sessions and class operations — one focused command center." : "Track attendance, classes, alerts, requests and academic progress from one calm workspace."}</p>

            <div className="auth-preview">
              <div className="preview-head"><span>Today</span><strong>{isCR ? "CLASS COMMAND CENTER" : "ACADEMIC PULSE"}</strong></div>
              <div className="preview-grid">
                <div><small>{isCR ? "PRESENT" : "ATTENDANCE"}</small><b>{isCR ? "42 / 48" : "86%"}</b><em>{isCR ? "students today" : "healthy range"}</em></div>
                <div><small>{isCR ? "NEXT ACTION" : "NEXT CLASS"}</small><b>{isCR ? "QR Session" : "Database"}</b><em>{isCR ? "ready to start" : "10:00 AM · Lab 2"}</em></div>
              </div>
              <div className="preview-bar"><i /></div>
            </div>
          </div>

          <div className="auth-visual-footer"><span>IUB · BS INFORMATION TECHNOLOGY</span><span>5M · 2024–28</span></div>
        </aside>

        <section className="auth-card-wrap">
          <div className="auth-card">
            <div className="auth-mobile-brand"><div className="auth-logo"><span>5</span></div><div><b>FIFTH FIVE</b><small>ATTENDANCE</small></div></div>
            <div className="auth-heading">
              <span className="auth-eyebrow">{isCR ? "CR PORTAL" : "STUDENT PORTAL"}</span>
              <h1>Welcome back<span>.</span></h1>
              <p>Sign in to continue to your {isCR ? "class management workspace" : "student workspace"}.</p>
            </div>

            <div className="auth-role-switch" role="tablist">
              <button type="button" className={!isCR ? "active" : ""} onClick={() => { setRole("STUDENT"); setError(""); }}>
                <span className="role-badge">ST</span><span><b>Student</b><small>Personal portal</small></span><i>→</i>
              </button>
              <button type="button" className={isCR ? "active" : ""} onClick={() => { setRole("ADMIN"); setError(""); }}>
                <span className="role-badge">CR</span><span><b>Class Rep</b><small>Management portal</small></span><i>→</i>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="auth-form">
              <label>{isCR ? "CR email" : "Registration number"}<div className="auth-input"><span>{isCR ? "@" : "#"}</span><input value={identifier} onChange={e => setIdentifier(e.target.value)} placeholder={isCR ? "cr@fifthfive.iub.edu.pk" : "BSIT-F21-045"} required autoCapitalize="none" autoComplete={isCR ? "email" : "username"} /></div></label>
              <label>Password<div className="auth-input"><span>••</span><input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Enter your password" required autoComplete="current-password" /></div></label>
              {error && <div className="auth-error"><b>!</b>{error}</div>}
              <button className="auth-submit" type="submit" disabled={loading}><span>{loading ? "Signing in…" : `Continue as ${isCR ? "Class Rep" : "Student"}`}</span><b>↗</b></button>
            </form>

            <div className="auth-security"><span>✓</span><div><b>Protected workspace</b><p>Your credentials and attendance data stay protected with role-based access.</p></div></div>
            <div className="auth-foot"><span>Fifth Five Attendance</span><span>v1.1</span></div>
          </div>
        </section>
      </section>
    </main>
  );
}
