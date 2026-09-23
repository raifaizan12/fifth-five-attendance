"use client";

import { useEffect, useRef, useState } from "react";

type Student = {
  id: string;
  fullName: string;
  iubId: string;
  regNumber: string;
  semester: string;
  section: string;
  email?: string | null;
  phone?: string | null;
  user?: { isActive: boolean } | null;
};

const emptyForm = { fullName: "", iubId: "", regNumber: "", semester: "", section: "Fifth Five", email: "", phone: "" };

export default function StudentsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [importResult, setImportResult] = useState<any>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function load(q = "") {
    setLoading(true);
    const res = await fetch(`/api/students${q ? `?q=${encodeURIComponent(q)}` : ""}`);
    const data = await res.json();
    setStudents(data.students || []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(""); setMessage("");
    const url = editingId ? `/api/students/${editingId}` : "/api/students";
    const method = editingId ? "PUT" : "POST";
    const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    const data = await res.json();
    if (!res.ok) { setError(data.error || "Something went wrong"); return; }
    setMessage(editingId ? "Student updated." : `Student added. Initial password: ${data.initialPassword}`);
    setForm(emptyForm);
    setEditingId(null);
    load(query);
  }

  function startEdit(s: Student) {
    setEditingId(s.id);
    setForm({ fullName: s.fullName, iubId: s.iubId, regNumber: s.regNumber, semester: s.semester, section: s.section, email: s.email || "", phone: s.phone || "" });
    setMessage(""); setError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleDelete(id: string) {
    if (!confirm("Remove this student? This cannot be undone.")) return;
    await fetch(`/api/students/${id}`, { method: "DELETE" });
    load(query);
  }

  async function handleImport() {
    const file = fileRef.current?.files?.[0];
    if (!file) return;
    const csvText = await file.text();
    const res = await fetch("/api/students/import", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ csvText }) });
    const data = await res.json();
    setImportResult(data);
    load(query);
  }

  return (
    <div>
      <div className="card">
        <h3 style={{ marginTop: 0 }}>{editingId ? "Edit Student" : "Add Student"}</h3>
        <form onSubmit={handleSubmit}>
          <div className="field"><label>Full Name</label><input value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} required /></div>
          <div className="field"><label>IUB ID</label><input value={form.iubId} onChange={(e) => setForm({ ...form, iubId: e.target.value })} required disabled={!!editingId} /></div>
          <div className="field"><label>Registration Number</label><input value={form.regNumber} onChange={(e) => setForm({ ...form, regNumber: e.target.value })} required disabled={!!editingId} /></div>
          <div className="field"><label>Semester</label><input value={form.semester} onChange={(e) => setForm({ ...form, semester: e.target.value })} required /></div>
          <div className="field"><label>Section</label><input value={form.section} onChange={(e) => setForm({ ...form, section: e.target.value })} /></div>
          <div className="field"><label>Email (optional)</label><input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
          <div className="field"><label>Contact Number (optional)</label><input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
          {error && <div className="error-text">{error}</div>}
          {message && <div className="success-text">{message}</div>}
          <div style={{ display: "flex", gap: 8 }}>
            <button type="submit" className="btn btn-primary">{editingId ? "Save Changes" : "Add Student"}</button>
            {editingId && <button type="button" className="btn btn-secondary" onClick={() => { setEditingId(null); setForm(emptyForm); }}>Cancel</button>}
          </div>
        </form>
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Import Students via CSV</h3>
        <div className="hint">Columns: Name, IUB ID, Registration Number, Semester, Section, Email, Phone</div>
        <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
          <input type="file" accept=".csv" ref={fileRef} />
          <button className="btn btn-secondary btn-sm" onClick={handleImport}>Import CSV</button>
        </div>
        {importResult && (
          <div style={{ marginTop: 12, fontSize: 13 }}>
            <div className="success-text">{importResult.successful.length} added successfully</div>
            {importResult.duplicates.length > 0 && <div className="error-text">{importResult.duplicates.length} duplicates skipped: {importResult.duplicates.join(", ")}</div>}
            {importResult.invalid.length > 0 && (
              <div className="error-text">
                {importResult.invalid.length} invalid rows:
                <ul>{importResult.invalid.map((i: any, idx: number) => <li key={idx}>Row {i.row}: {i.reason}</li>)}</ul>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="card">
        <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
          <input placeholder="Search by name or ID..." value={query} onChange={(e) => { setQuery(e.target.value); load(e.target.value); }} />
        </div>
        {loading ? <div>Loading...</div> : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Name</th><th>IUB ID</th><th>Reg #</th><th>Semester</th><th>Status</th><th></th></tr></thead>
              <tbody>
                {students.map((s) => (
                  <tr key={s.id}>
                    <td>{s.fullName}</td>
                    <td>{s.iubId}</td>
                    <td>{s.regNumber}</td>
                    <td>{s.semester}</td>
                    <td>{s.user?.isActive === false ? <span className="badge badge-absent">Inactive</span> : <span className="badge badge-present">Active</span>}</td>
                    <td style={{ display: "flex", gap: 6 }}>
                      <button className="btn btn-secondary btn-sm" onClick={() => startEdit(s)}>Edit</button>
                      <button className="btn btn-danger btn-sm" onClick={() => handleDelete(s.id)}>Remove</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
