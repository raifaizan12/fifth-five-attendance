"use client";

import { useEffect, useState } from "react";

type Teacher = { id: string; fullName: string; email?: string | null; phone?: string | null };
type Subject = { id: string; name: string; code?: string | null; semester?: string | null; teacher?: Teacher | null; teacherId?: string | null };

export default function SubjectsPage() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [subjectForm, setSubjectForm] = useState({ name: "", code: "", semester: "", teacherId: "" });
  const [teacherForm, setTeacherForm] = useState({ fullName: "", email: "", phone: "" });
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const [sRes, tRes] = await Promise.all([fetch("/api/subjects").then((r) => r.json()), fetch("/api/teachers").then((r) => r.json())]);
    setSubjects(sRes.subjects || []);
    setTeachers(tRes.teachers || []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function addSubject(e: React.FormEvent) {
    e.preventDefault();
    await fetch("/api/subjects", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(subjectForm) });
    setSubjectForm({ name: "", code: "", semester: "", teacherId: "" });
    load();
  }

  async function addTeacher(e: React.FormEvent) {
    e.preventDefault();
    await fetch("/api/teachers", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(teacherForm) });
    setTeacherForm({ fullName: "", email: "", phone: "" });
    load();
  }

  async function deleteSubject(id: string) {
    if (!confirm("Delete this subject? All related attendance sessions will also be removed.")) return;
    await fetch(`/api/subjects/${id}`, { method: "DELETE" });
    load();
  }

  return (
    <div>
      <div className="card">
        <h3 style={{ marginTop: 0 }}>Add Subject</h3>
        <form onSubmit={addSubject}>
          <div className="field"><label>Subject Name</label><input value={subjectForm.name} onChange={(e) => setSubjectForm({ ...subjectForm, name: e.target.value })} required /></div>
          <div className="field"><label>Code (optional)</label><input value={subjectForm.code} onChange={(e) => setSubjectForm({ ...subjectForm, code: e.target.value })} /></div>
          <div className="field"><label>Semester (optional)</label><input value={subjectForm.semester} onChange={(e) => setSubjectForm({ ...subjectForm, semester: e.target.value })} /></div>
          <div className="field">
            <label>Teacher</label>
            <select value={subjectForm.teacherId} onChange={(e) => setSubjectForm({ ...subjectForm, teacherId: e.target.value })}>
              <option value="">-- None --</option>
              {teachers.map((t) => <option key={t.id} value={t.id}>{t.fullName}</option>)}
            </select>
          </div>
          <button type="submit" className="btn btn-primary">Add Subject</button>
        </form>
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Add Teacher</h3>
        <form onSubmit={addTeacher}>
          <div className="field"><label>Full Name</label><input value={teacherForm.fullName} onChange={(e) => setTeacherForm({ ...teacherForm, fullName: e.target.value })} required /></div>
          <div className="field"><label>Email (optional)</label><input value={teacherForm.email} onChange={(e) => setTeacherForm({ ...teacherForm, email: e.target.value })} /></div>
          <div className="field"><label>Phone (optional)</label><input value={teacherForm.phone} onChange={(e) => setTeacherForm({ ...teacherForm, phone: e.target.value })} /></div>
          <button type="submit" className="btn btn-primary">Add Teacher</button>
        </form>
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Subjects</h3>
        {loading ? "Loading..." : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Name</th><th>Code</th><th>Teacher</th><th></th></tr></thead>
              <tbody>
                {subjects.map((s) => (
                  <tr key={s.id}>
                    <td>{s.name}</td>
                    <td>{s.code || "-"}</td>
                    <td>{s.teacher?.fullName || "-"}</td>
                    <td><button className="btn btn-danger btn-sm" onClick={() => deleteSubject(s.id)}>Delete</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Teachers</h3>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Name</th><th>Email</th><th>Phone</th></tr></thead>
            <tbody>
              {teachers.map((t) => (
                <tr key={t.id}><td>{t.fullName}</td><td>{t.email || "-"}</td><td>{t.phone || "-"}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
