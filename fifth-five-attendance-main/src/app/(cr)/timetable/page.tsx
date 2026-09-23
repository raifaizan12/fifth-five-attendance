"use client";

import { useEffect, useState } from "react";

type Teacher = { id: string; fullName: string };
type Subject = { id: string; name: string; teacherId?: string | null };
type Entry = {
  id: string;
  day: string;
  startTime: string;
  endTime: string;
  room?: string | null;
  section: string;
  subject: { id: string; name: string };
  teacher?: { id: string; fullName: string } | null;
};

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

const emptyForm = { day: "Monday", startTime: "09:00", endTime: "10:00", subjectId: "", teacherId: "", room: "" };

export default function TimetablePage() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
<<<<<<< HEAD
=======
  const todayName = new Date().toLocaleDateString("en-US", { weekday: "long" });
  const tomorrowName = new Date(Date.now() + 86400000).toLocaleDateString("en-US", { weekday: "long" });
>>>>>>> 4c776aa (Premium portal UI and CR management updates)

  async function load() {
    setLoading(true);
    const [ttRes, sRes, tRes] = await Promise.all([
      fetch("/api/timetable"),
      fetch("/api/subjects"),
      fetch("/api/teachers"),
    ]);
    const tt = ttRes.ok ? await ttRes.json() : { entries: [] };
    const s = sRes.ok ? await sRes.json() : { subjects: [] };
    const t = tRes.ok ? await tRes.json() : { teachers: [] };
    setEntries(tt.entries || []);
    setSubjects(s.subjects || []);
    setTeachers(t.teachers || []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  // When a subject is picked, auto-fill its usual teacher (still editable).
  function onSubjectChange(subjectId: string) {
    const subj = subjects.find((s) => s.id === subjectId);
    setForm({ ...form, subjectId, teacherId: subj?.teacherId || form.teacherId });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setMessage("");
    const url = editingId ? `/api/timetable/${editingId}` : "/api/timetable";
    const method = editingId ? "PUT" : "POST";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error || "Something went wrong");
      return;
    }
    setMessage(editingId ? "Class updated." : "Class added to timetable.");
    setForm(emptyForm);
    setEditingId(null);
    load();
  }

  function startEdit(entry: Entry) {
    setEditingId(entry.id);
    setForm({
      day: entry.day,
      startTime: entry.startTime,
      endTime: entry.endTime,
      subjectId: entry.subject.id,
      teacherId: entry.teacher?.id || "",
      room: entry.room || "",
    });
    setError("");
    setMessage("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleDelete(id: string) {
    if (!confirm("Remove this class from the timetable?")) return;
    await fetch(`/api/timetable/${id}`, { method: "DELETE" });
    load();
  }

  const byDay = DAYS.map((day) => ({ day, classes: entries.filter((e) => e.day === day) }));

  return (
    <div>
<<<<<<< HEAD
      <div className="card">
        <h3 style={{ marginTop: 0 }}>{editingId ? "Edit Class" : "Add Class to timetable"}</h3>
=======
      <div className="page-heading">
        <div><div className="eyebrow">SCHEDULE CONTROL</div><h2>Timetable Manager</h2><p>Today and tomorrow are controlled here by the CR. Changes appear instantly on the Student Portal.</p></div>
        <span className="live-pill"><i /> Student Sync On</span>
      </div>
      <div className="quick-days card">
        <div><strong>Quick manage</strong><div className="hint">Jump directly to the days students see first.</div></div>
        <div className="quick-day-buttons">
          <button className={`day-jump ${form.day === todayName ? "active" : ""}`} onClick={() => setForm({ ...form, day: todayName })}><span>Today</span><small>{todayName}</small></button>
          <button className={`day-jump ${form.day === tomorrowName ? "active" : ""}`} onClick={() => setForm({ ...form, day: tomorrowName })}><span>Tomorrow</span><small>{tomorrowName}</small></button>
        </div>
      </div>
      <div className="card">
        <h3 style={{ marginTop: 0 }}>{editingId ? "Edit Class" : `Add ${form.day} Class`}</h3>
>>>>>>> 4c776aa (Premium portal UI and CR management updates)
        <form onSubmit={handleSubmit}>
          <div className="field">
            <label>Day</label>
            <select value={form.day} onChange={(e) => setForm({ ...form, day: e.target.value })}>
              {DAYS.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>
          <div style={{ display: "flex", gap: 12 }}>
            <div className="field" style={{ flex: 1 }}>
              <label>Start Time</label>
              <input type="time" value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })} required />
            </div>
            <div className="field" style={{ flex: 1 }}>
              <label>End Time</label>
              <input type="time" value={form.endTime} onChange={(e) => setForm({ ...form, endTime: e.target.value })} required />
            </div>
          </div>
          <div className="field">
            <label>Subject</label>
            <select value={form.subjectId} onChange={(e) => onSubjectChange(e.target.value)} required>
              <option value="">-- Select subject --</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Teacher (optional)</label>
            <select value={form.teacherId} onChange={(e) => setForm({ ...form, teacherId: e.target.value })}>
              <option value="">-- None --</option>
              {teachers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.fullName}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Room / Venue (optional)</label>
            <input value={form.room} onChange={(e) => setForm({ ...form, room: e.target.value })} placeholder="e.g. Room 204" />
          </div>
          {error && <div className="error-text">{error}</div>}
          {message && <div className="success-text">{message}</div>}
          <div style={{ display: "flex", gap: 8 }}>
            <button type="submit" className="btn btn-primary">
              {editingId ? "Save Changes" : "Add Class"}
            </button>
            {editingId && (
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  setEditingId(null);
                  setForm(emptyForm);
                }}
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>

      {loading ? (
        <div className="card">Loading timetable...</div>
      ) : (
        byDay.map(({ day, classes }) => (
          <div className="card" key={day}>
            <h3 style={{ marginTop: 0 }}>{day}</h3>
            {classes.length === 0 ? (
              <div className="hint">No classes scheduled.</div>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Time</th>
                      <th>Subject</th>
                      <th>Teacher</th>
                      <th>Room</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {classes.map((c) => (
                      <tr key={c.id}>
                        <td>
                          {c.startTime} – {c.endTime}
                        </td>
                        <td>{c.subject.name}</td>
                        <td>{c.teacher?.fullName || "—"}</td>
                        <td>{c.room || "—"}</td>
                        <td style={{ display: "flex", gap: 6 }}>
                          <button className="btn btn-secondary btn-sm" onClick={() => startEdit(c)}>
                            Edit
                          </button>
                          <button className="btn btn-danger btn-sm" onClick={() => handleDelete(c.id)}>
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
}
