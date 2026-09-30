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
  useEffect(() => { fetch("/api/portal-status").then(r => r.json()).then(setMaintenance).catch(() => setMaintenance(null)); }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (role === "STUDENT" && maintenance?.maintenanceMode) { setError("Student portal is currently under maintenance."); return; }
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

  return (
    <div className="login-wrap">
      <div className={`login-card ${role === "ADMIN" ? "login-card-cr" : "login-card-student"}`}>
        <h1>5M(2024-28) Portal</h1>
        <div className="sub">BS Information Technology · The Islamia University of Bahawalpur</div>
        {maintenance?.maintenanceMode && role === "STUDENT" && (
          <div role="status" aria-live="polite" style={{ marginTop: 14, padding: "12px 14px", borderRadius: 12, background: "#fff7ed", border: "1px solid #fdba74", color: "#9a3412", textAlign: "left", lineHeight: 1.55 }}>
            <strong style={{ display: "block", marginBottom: 4 }}>Student portal is under maintenance</strong>
            <span>{maintenance.maintenanceMessage || "Please check back soon or contact your Class Representative."}</span>
          </div>
        )}

        <div className="role-toggle">
          <button type="button" className={role === "STUDENT" ? "active" : ""} onClick={() => setRole("STUDENT")}>
            Student
          </button>
          <button type="button" className={role === "ADMIN" ? "active" : ""} onClick={() => setRole("ADMIN")}>
            Class Representative
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="field">
            <label>{role === "ADMIN" ? "CR Email" : " Registration Number"}</label>
            <input
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder={role === "ADMIN" ? "cr@fifthfive.iub.edu.pk" : "e.g. BSIT-F21-045"}
              required
              autoCapitalize="none"
            />
          </div>
          <div className="field">
            <label>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          {error && <div className="error-text">{error}</div>}
          <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
            {loading ? "Signing in..." : "Log In"}
          </button>
        </form>
        <div className="hint">
          <div style={{marginBottom:8,fontWeight:600}}>Portal Version: v1.1.0</div>
          Students: use the password shared by your CR. Contact your CR if you can&apos;t log in.
        </div>
      </div>
    </div>
  );
}
