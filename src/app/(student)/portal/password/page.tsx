"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";

export default function StudentPasswordPage() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPasswords, setShowPasswords] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setSuccess("");
    if (newPassword !== confirmPassword) {
      setError("The new passwords do not match.");
      return;
    }
    if (newPassword.length < 8) {
      setError("Choose a password with at least 8 characters.");
      return;
    }
    setBusy(true);
    try {
      const response = await fetch("/api/student/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword, confirmPassword }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to update password.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setSuccess("Your password has been changed. Use your new password the next time you log in.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="page student-password-page">
      <div className="student-password-hero">
        <div>
          <span className="student-password-kicker">ACCOUNT & SECURITY</span>
          <h1>Make your account yours<span>.</span></h1>
          <p>Set a private password to protect your attendance, notices, timetable, and class information.</p>
        </div>
        <div className="student-password-hero-icon" aria-hidden="true">✦</div>
      </div>

      <div className="student-password-grid">
        <section className="student-password-card">
          <div className="student-password-card-title"><div className="student-password-icon">⌑</div><div><h2>Change password</h2><p>Choose a strong password you do not use elsewhere.</p></div></div>
          <form onSubmit={submit} className="student-password-form">
            <label>Current password<input value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} type={showPasswords ? "text" : "password"} autoComplete="current-password" required placeholder="Enter current password" /></label>
            <label>New password<input value={newPassword} onChange={e => setNewPassword(e.target.value)} type={showPasswords ? "text" : "password"} autoComplete="new-password" required minLength={8} placeholder="At least 8 characters" /></label>
            <label>Confirm new password<input value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} type={showPasswords ? "text" : "password"} autoComplete="new-password" required minLength={8} placeholder="Enter it again" /></label>
            <label className="student-password-show"><input type="checkbox" checked={showPasswords} onChange={e => setShowPasswords(e.target.checked)} /> Show passwords</label>
            {error && <div className="student-password-message error" role="alert">{error}</div>}
            {success && <div className="student-password-message success" role="status">{success}</div>}
            <button className="student-password-submit" type="submit" disabled={busy}>{busy ? "Updating password…" : "Save new password"}<span>↗</span></button>
          </form>
        </section>

        <aside className="student-password-tips">
          <div className="student-password-tip-mark">✓</div>
          <h2>Keep your account secure</h2>
          <ul>
            <li>Use at least 8 characters.</li>
            <li>Combine words, numbers, and symbols for a stronger password.</li>
            <li>Do not share your password with classmates.</li>
            <li>Your password is stored as a secure hash, not plain text.</li>
          </ul>
          <div className="student-password-note"><b>First time signing in?</b><p>Your CR may have provided an initial password. Sign in with your IUB ID and that initial password, then change it here.</p></div>
          <Link href="/portal" className="student-password-back">← Back to student dashboard</Link>
        </aside>
      </div>
    </main>
  );
}
