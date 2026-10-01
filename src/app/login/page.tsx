"use client";

import { useEffect, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [role, setRole] = useState<"ADMIN" | "STUDENT">("STUDENT");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [maintenance, setMaintenance] = useState<{maintenanceMode:boolean; maintenanceMessage:string} | null>(null);

  useEffect(() => {
    let active = true;
    const loadStatus = async () => {
      try {
        const response = await fetch("/api/portal-status", { cache: "no-store" });
        if (!response.ok) throw new Error("Unable to load portal status");
        const data = await response.json();
        if (active) setMaintenance({
          maintenanceMode: Boolean(data.maintenanceMode),
          maintenanceMessage: data.maintenanceMessage || "",
        });
      } catch {
        if (active) setMaintenance({ maintenanceMode: false, maintenanceMessage: "" });
      }
    };
    loadStatus();
    const interval = window.setInterval(loadStatus, 10000);
    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (role === "STUDENT" && maintenance?.maintenanceMode) return;

    setLoading(true);
    const res = await signIn("credentials", {
      identifier,
      password,
      redirect: false,
    });
    setLoading(false);

    if (res?.error) {
      setError(res.error === "CredentialsSignin" ? "Invalid credentials. Please check and try again." : res.error);
      return;
    }

    router.push(role === "ADMIN" ? "/dashboard" : "/portal");
    router.refresh();
  }

  const isCR = role === "ADMIN";

  return (
    <main className="login-wrap">
      <div className={`login-shell ${isCR ? "login-shell-cr" : "login-shell-student"}`}>
        <section className="login-showcase" aria-hidden="true">
          <div className="showcase-grid" />
          <div className="showcase-orb showcase-orb-one" />
          <div className="showcase-orb showcase-orb-two" />

          <div className="showcase-content">
            <div className="login-brand">
              <span className="login-brand-mark">
                <svg viewBox="0 0 24 24" fill="none">
                  <path d="M5 12.5 9.2 17 19 6.5" stroke="currentColor" strokeWidth="2.7" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </span>
              <div>
                <strong>5M Attendance</strong>
                <span>IUB · BS Information Technology</span>
              </div>
            </div>

            <div className="showcase-copy">
              <span className="showcase-kicker">{isCR ? "CLASS REPRESENTATIVE" : "STUDENT PORTAL"}</span>
              <h2>{isCR ? "Run your class with clarity." : "Your academic day, in one place."}</h2>
              <p>
                {isCR
                  ? "A focused workspace for attendance, students, schedules, reports and class coordination."
                  : "Track attendance, classes, assignments, exams and your academic progress from one calm workspace."}
              </p>
            </div>

            <div className="showcase-points">
              <div><span>01</span><b>Secure access</b><small>Role-based portal entry</small></div>
              <div><span>02</span><b>Live information</b><small>Attendance & timetable at a glance</small></div>
              <div><span>03</span><b>Built for 5M</b><small>Designed around your class workflow</small></div>
            </div>

            <div className="showcase-footer">
              <span>THE ISLAMIA UNIVERSITY OF BAHAWALPUR</span>
              <span>2026 · 5M(2024–28)</span>
            </div>
          </div>
        </section>

        <section className="login-panel">
          <div className="login-panel-inner">
            <div className="mobile-brand login-brand">
              <span className="login-brand-mark">
                <svg viewBox="0 0 24 24" fill="none">
                  <path d="M5 12.5 9.2 17 19 6.5" stroke="currentColor" strokeWidth="2.7" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </span>
              <div>
                <strong>5M Attendance</strong>
                <span>IUB · BS Information Technology</span>
              </div>
            </div>

            <div className="login-heading">
              <span className="eyebrow">{isCR ? "CR PORTAL" : "STUDENT PORTAL"}</span>
              <h1>Welcome back</h1>
              <p>Sign in to continue to your {isCR ? "class management" : "student"} workspace.</p>
            </div>

            {role === "STUDENT" && maintenance?.maintenanceMode ? (
              <section className="maintenance-card" role="status" aria-live="polite">
                <div className="maintenance-icon">🛠️</div>
                <h2>We’ll Be Back Soon</h2>
                <p>{maintenance.maintenanceMessage?.trim() || "The student portal is temporarily unavailable. Please check back soon."}</p>
                <div className="maintenance-divider" />
                <p className="maintenance-signoff">
                  Regards,<br /><strong>Roy Faizan</strong><br />
                  © 2026 All rights reserved.<br />
                  Developed by <strong>Faizan Technologies</strong>
                </p>
              </section>
            ) : (
              <>
                <div className="role-toggle" aria-label="Choose portal">
                  <button type="button" className={role === "STUDENT" ? "active" : ""} onClick={() => { setRole("STUDENT"); setError(""); }}>
                    <span className="role-icon">S</span>
                    <span><b>Student</b><small>Personal portal</small></span>
                  </button>
                  <button type="button" className={role === "ADMIN" ? "active" : ""} onClick={() => { setRole("ADMIN"); setError(""); }}>
                    <span className="role-icon">CR</span>
                    <span><b>Class Rep</b><small>Management portal</small></span>
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="login-form">
                  <div className="field">
                    <label>{isCR ? "CR Email" : "Registration Number"}</label>
                    <div className="input-shell">
                      <span className="input-icon" aria-hidden="true">
                        <svg viewBox="0 0 24 24" fill="none">
                          <path d={isCR ? "M4 6h16v12H4zM4 7l8 6 8-6" : "M6 4h12v16H6zM9 8h6M9 12h6M9 16h3"} stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </span>
                      <input
                        value={identifier}
                        onChange={(e) => setIdentifier(e.target.value)}
                        placeholder={isCR ? "cr@fifthfive.iub.edu.pk" : "e.g. BSIT-F21-045"}
                        required
                        autoCapitalize="none"
                        autoComplete={isCR ? "email" : "username"}
                      />
                    </div>
                  </div>

                  <div className="field">
                    <label>Password</label>
                    <div className="input-shell">
                      <span className="input-icon" aria-hidden="true">
                        <svg viewBox="0 0 24 24" fill="none">
                          <rect x="5" y="10" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="1.7"/>
                          <path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/>
                        </svg>
                      </span>
                      <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        autoComplete="current-password"
                        placeholder="Enter your password"
                      />
                    </div>
                  </div>

                  {error && (
                    <div className="login-error" role="alert">
                      <span>!</span>{error}
                    </div>
                  )}

                  <button type="submit" className="btn btn-primary btn-block login-submit" disabled={loading || (role === "STUDENT" && Boolean(maintenance?.maintenanceMode))}>
                    <span>{loading ? "Signing in..." : `Continue as ${isCR ? "Class Rep" : "Student"}`}</span>
                    {!loading && <span className="submit-arrow">→</span>}
                  </button>
                </form>

                <div className="login-note">
                  <span className="secure-dot" />
                  <div>
                    <strong>Private & secure access</strong>
                    <p>Students: use the password shared by your CR. Contact your CR if you can’t log in.</p>
                  </div>
                </div>
              </>
            )}

            <div className="login-version">
              <span>Portal v1.1.0</span>
              <span>•</span>
              <span>5M(2024–28)</span>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
