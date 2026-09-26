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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
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
        <h1>Fifth Five Attendance Portal</h1>
        <div className="sub">BS Information Technology · The Islamia University of Bahawalpur</div>

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
            <label>{role === "ADMIN" ? "CR Email" : "IUB ID / Registration Number"}</label>
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
          Students: use the password shared by your CR. Contact your CR if you can&apos;t log in.
        </div>
      </div>
    </div>
  );
}
