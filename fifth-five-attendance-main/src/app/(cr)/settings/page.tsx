"use client";

<<<<<<< HEAD
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
=======
import { useEffect, useRef, useState } from "react";

export default function SettingsPage() {
  const [form, setForm] = useState({
    className: "", university: "", program: "", semester: "", academicYear: "", attendanceThreshold: 75, portalLogoUrl: "" as string,
  });
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/settings").then((r) => r.json()).then((data) => {
      setForm({ ...data.settings, portalLogoUrl: data.settings?.portalLogoUrl || "" });
>>>>>>> 4c776aa (Premium portal UI and CR management updates)
      setLoading(false);
    });
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setMessage("");
    const res = await fetch("/api/settings", {
<<<<<<< HEAD
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
=======
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, attendanceThreshold: Number(form.attendanceThreshold) }),
    });
    setMessage(res.ok ? "Portal settings saved successfully ✓" : "Failed to save settings.");
  }

  function chooseLogo(file?: File) {
    if (!file) return;
    if (!file.type.startsWith("image/")) { setMessage("Please choose an image file."); return; }
    if (file.size > 650000) { setMessage("Logo should be under 650 KB."); return; }
    setUploading(true);
    const reader = new FileReader();
    reader.onload = () => { setForm((f) => ({ ...f, portalLogoUrl: String(reader.result || "") })); setUploading(false); setMessage("Logo selected. Click Save Settings to publish it."); };
    reader.onerror = () => { setUploading(false); setMessage("Could not read the logo file."); };
    reader.readAsDataURL(file);
  }

  if (loading) return <div className="card">Loading settings...</div>;

  return (
    <div>
      <div className="page-heading">
        <div><div className="eyebrow">CONTROL CENTER</div><h2>Portal Settings</h2><p>Manage the identity and student-facing experience of the 5th-5M portal.</p></div>
        <span className="live-pill"><i /> CR Managed</span>
      </div>

      <div className="settings-layout">
        <div className="card settings-brand-card">
          <div className="eyebrow">PORTAL BRANDING</div>
          <h3>Logo shown everywhere</h3>
          <p className="hint">Upload your class/portal logo here. It automatically appears on the Student Portal and CR Portal.</p>
          <div className="logo-preview">
            {form.portalLogoUrl ? <img src={form.portalLogoUrl} alt="Portal logo preview" /> : <div className="logo-placeholder">5M</div>}
          </div>
          <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" onChange={(e) => chooseLogo(e.target.files?.[0])} style={{ display: "none" }} />
          <button type="button" className="btn btn-secondary btn-block" onClick={() => fileRef.current?.click()} disabled={uploading}>{uploading ? "Reading logo..." : "Choose Logo"}</button>
          <div className="field" style={{ marginTop: 12 }}>
            <label>Or use an image URL</label>
            <input value={form.portalLogoUrl} onChange={(e) => setForm({ ...form, portalLogoUrl: e.target.value })} placeholder="https://example.com/logo.png" />
          </div>
          {form.portalLogoUrl && <button type="button" className="btn btn-danger btn-sm" onClick={() => setForm({ ...form, portalLogoUrl: "" })}>Remove Logo</button>}
        </div>

        <div className="card">
          <div className="eyebrow">CLASS IDENTITY</div><h3>Class & System Settings</h3>
          <form onSubmit={save}>
            <div className="field"><label>Class Name</label><input value={form.className} onChange={(e) => setForm({ ...form, className: e.target.value })} /></div>
            <div className="field"><label>University</label><input value={form.university} onChange={(e) => setForm({ ...form, university: e.target.value })} /></div>
            <div className="field"><label>Program</label><input value={form.program} onChange={(e) => setForm({ ...form, program: e.target.value })} /></div>
            <div className="form-two"><div className="field"><label>Semester</label><input value={form.semester} onChange={(e) => setForm({ ...form, semester: e.target.value })} /></div><div className="field"><label>Academic Year</label><input value={form.academicYear} onChange={(e) => setForm({ ...form, academicYear: e.target.value })} /></div></div>
            <div className="field"><label>Attendance Threshold (%)</label><input type="number" min={1} max={100} value={form.attendanceThreshold} onChange={(e) => setForm({ ...form, attendanceThreshold: Number(e.target.value) })} /></div>
            {message && <div className={message.includes("successfully") || message.includes("selected") ? "success-text" : "error-text"}>{message}</div>}
            <button type="submit" className="btn btn-primary">Save Settings</button>
          </form>
        </div>
      </div>
>>>>>>> 4c776aa (Premium portal UI and CR management updates)
    </div>
  );
}
