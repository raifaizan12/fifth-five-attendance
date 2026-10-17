"use client";

import { useEffect, useState } from "react";

export default function SettingsPage() {
  const [form, setForm] = useState({
    className: "", university: "", program: "", semester: "", academicYear: "", attendanceThreshold: 75,
  });
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/settings").then((r) => r.json()).then((data) => {
      setForm(data.settings);
      setLoading(false);
    });
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setMessage("");
    const res = await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, attendanceThreshold: Number(form.attendanceThreshold) }),
    });
    if (res.ok) setMessage("Settings saved.");
    else setMessage("Failed to save settings.");
  }

  if (loading) return <div className="card">Loading...</div>;

  return (
    <div className="card">
      <h3 style={{ marginTop: 0 }}>Class & System Settings</h3>
      <form onSubmit={save}>
        <div className="field"><label>Class Name</label><input value={form.className} onChange={(e) => setForm({ ...form, className: e.target.value })} /></div>
        <div className="field"><label>University</label><input value={form.university} onChange={(e) => setForm({ ...form, university: e.target.value })} /></div>
        <div className="field"><label>Program</label><input value={form.program} onChange={(e) => setForm({ ...form, program: e.target.value })} /></div>
        <div className="field"><label>Semester</label><input value={form.semester} onChange={(e) => setForm({ ...form, semester: e.target.value })} /></div>
        <div className="field"><label>Academic Year</label><input value={form.academicYear} onChange={(e) => setForm({ ...form, academicYear: e.target.value })} /></div>
        <div className="field">
          <label>Attendance Threshold (%)</label>
          <input type="number" min={1} max={100} value={form.attendanceThreshold} onChange={(e) => setForm({ ...form, attendanceThreshold: Number(e.target.value) })} />
        </div>
        {message && <div className="success-text">{message}</div>}
        <button type="submit" className="btn btn-primary">Save Settings</button>
      </form>
    </div>
  );
}
