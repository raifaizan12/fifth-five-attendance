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
    if (role === "STUDENT" && maintenance?.maintenanceMode) { return; }
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
        {role === "STUDENT" && maintenance?.maintenanceMode && (
          <section role="status" aria-live="polite" style={{marginTop:20,padding:"22px 20px",borderRadius:18,background:"linear-gradient(135deg,#eff6ff 0%,#f5f3ff 100%)",border:"1px solid #dbeafe",textAlign:"center",color:"#1e293b"}}>
            <div aria-hidden="true" style={{fontSize:34,marginBottom:10}}>🛠️</div>
            <h2 style={{fontSize:21,fontWeight:750,margin:"0 0 10px",color:"#1e3a8a"}}>We’ll Be Back Soon</h2>
            <p style={{fontSize:14,lineHeight:1.75,margin:"0 auto",maxWidth:390,color:"#334155"}}>
              {maintenance.maintenanceMessage?.trim() || "The student portal is temporarily unavailable while we carry out scheduled maintenance. Please check back soon."}
            </p>
            <p style={{fontSize:13,lineHeight:1.6,margin:"16px 0 0",color:"#475569"}}>
              Thank you for your patience and understanding.
            </p>
            <div style={{height:1,background:"#cbd5e1",opacity:.7,margin:"18px 0 12px"}} />
            <p style={{fontSize:13,lineHeight:1.8,margin:0,color:"#334155"}}>
              Regards,<br /><strong>Roy Faizan</strong><br />
              © 2026 All rights reserved.<br />
              Developed by <strong>Faizan Technologies</strong>
            </p>
          </section>
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
          <button type="submit" className="btn btn-primary btn-block" disabled={loading || (role === "STUDENT" && Boolean(maintenance?.maintenanceMode))}>
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
