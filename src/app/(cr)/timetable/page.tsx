"use client";

import { useEffect, useMemo, useState } from "react";
import PortalLogo from "@/components/PortalLogo";

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

function formatTime(value: string) {
  const [h, m] = value.split(":").map(Number);
  const suffix = h >= 12 ? "PM" : "AM";
  const hour = h % 12 || 12;
  return `${hour}:${String(m).padStart(2, "0")} ${suffix}`;
}

export default function TimetablePage() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");
  const [filterDay, setFilterDay] = useState("All");

  async function load() {
    setLoading(true);
    const [ttRes, sRes, tRes] = await Promise.all([fetch("/api/timetable"), fetch("/api/subjects"), fetch("/api/teachers")]);
    const [tt, s, t] = await Promise.all([
      ttRes.ok ? ttRes.json() : Promise.resolve({ entries: [] }),
      sRes.ok ? sRes.json() : Promise.resolve({ subjects: [] }),
      tRes.ok ? tRes.json() : Promise.resolve({ teachers: [] }),
    ]);
    setEntries(tt.entries || []);
    setSubjects(s.subjects || []);
    setTeachers(t.teachers || []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  function onSubjectChange(subjectId: string) {
    const subj = subjects.find((s) => s.id === subjectId);
    setForm((f) => ({ ...f, subjectId, teacherId: subj?.teacherId || f.teacherId }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setMessage("");
    setSaving(true);
    const url = editingId ? `/api/timetable/${editingId}` : "/api/timetable";
    const res = await fetch(url, { method: editingId ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    const data = await res.json().catch(() => ({}));
    setSaving(false);
    if (!res.ok) {
      setError(data.error || "Could not save this class.");
      return;
    }
    setMessage(editingId ? "Class updated successfully." : "Class added to the live timetable.");
    setForm(emptyForm);
    setEditingId(null);
    await load();
  }

  function startEdit(entry: Entry) {
    setEditingId(entry.id);
    setForm({ day: entry.day, startTime: entry.startTime, endTime: entry.endTime, subjectId: entry.subject.id, teacherId: entry.teacher?.id || "", room: entry.room || "" });
    setError("");
    setMessage("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleDelete(id: string) {
    if (!confirm("Remove this class from the live timetable?")) return;
    const res = await fetch(`/api/timetable/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Could not remove class.");
      return;
    }
    setMessage("Class removed from the timetable.");
    await load();
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return entries.filter((e) => {
      const dayOk = filterDay === "All" || e.day === filterDay;
      const text = `${e.day} ${e.subject.name} ${e.teacher?.fullName || ""} ${e.room || ""}`.toLowerCase();
      return dayOk && (!q || text.includes(q));
    });
  }, [entries, search, filterDay]);

  const stats = useMemo(() => ({
    classes: entries.length,
    days: new Set(entries.map((e) => e.day)).size,
    subjects: new Set(entries.map((e) => e.subject.id)).size,
    rooms: new Set(entries.map((e) => e.room).filter(Boolean)).size,
  }), [entries]);

  const grouped = DAYS.map((day) => ({ day, classes: filtered.filter((e) => e.day === day) })).filter((x) => filterDay === "All" || x.day === filterDay);

  return (
    <div className="timetable-manager">
      <section className="tt-hero">
        <div className="tt-hero-brand"><PortalLogo size={58} /><div><div className="eyebrow">CR CONTROL CENTER</div><h2>Timetable Manager</h2><p>Build the official class schedule once. Students see your changes automatically on the Student Portal.</p></div></div>
        <div className="live-pill"><i /> LIVE STUDENT SYNC</div>
      </section>

      <div className="stat-grid tt-stats">
        <div className="stat-card"><div className="label">SCHEDULED CLASSES</div><div className="value">{stats.classes}</div><div className="tt-stat-note">Across the week</div></div>
        <div className="stat-card"><div className="label">ACTIVE DAYS</div><div className="value">{stats.days}</div><div className="tt-stat-note">Days with classes</div></div>
        <div className="stat-card"><div className="label">SUBJECTS</div><div className="value">{stats.subjects}</div><div className="tt-stat-note">Unique subjects</div></div>
        <div className="stat-card"><div className="label">ROOMS</div><div className="value">{stats.rooms}</div><div className="tt-stat-note">Venues in use</div></div>
      </div>

      <div className="tt-layout">
        <section className="card tt-editor">
          <div className="tt-section-title"><div><div className="eyebrow">SCHEDULE BUILDER</div><h3>{editingId ? "Edit class" : "Add a class"}</h3></div><span className="tt-mini-badge">CR ONLY</span></div>
          <form onSubmit={handleSubmit}>
            <div className="form-two">
              <div className="field"><label>Day</label><select value={form.day} onChange={(e) => setForm({ ...form, day: e.target.value })}>{DAYS.map((d) => <option key={d}>{d}</option>)}</select></div>
              <div className="field"><label>Room / Venue</label><input value={form.room} onChange={(e) => setForm({ ...form, room: e.target.value })} placeholder="Room 204" /></div>
            </div>
            <div className="form-two">
              <div className="field"><label>Start time</label><input type="time" value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })} required /></div>
              <div className="field"><label>End time</label><input type="time" value={form.endTime} onChange={(e) => setForm({ ...form, endTime: e.target.value })} required /></div>
            </div>
            <div className="field"><label>Subject</label><select value={form.subjectId} onChange={(e) => onSubjectChange(e.target.value)} required><option value="">Select subject</option>{subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
            <div className="field"><label>Teacher</label><select value={form.teacherId} onChange={(e) => setForm({ ...form, teacherId: e.target.value })}><option value="">No teacher assigned</option>{teachers.map((t) => <option key={t.id} value={t.id}>{t.fullName}</option>)}</select></div>
            {error && <div className="error-text tt-message">{error}</div>}
            {message && <div className="success-text tt-message">✓ {message}</div>}
            <div className="tt-actions"><button className="btn btn-primary" disabled={saving}>{saving ? "Saving..." : editingId ? "Save Changes" : "Add to Timetable"}</button>{editingId && <button type="button" className="btn btn-secondary" onClick={() => { setEditingId(null); setForm(emptyForm); }}>Cancel</button>}</div>
          </form>
        </section>

        <section className="tt-schedule">
          <div className="card tt-toolbar">
            <div><div className="eyebrow">OFFICIAL CLASS SCHEDULE</div><h3>Weekly timetable</h3></div>
            <div className="tt-filters"><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search subject, teacher, room..." /><select value={filterDay} onChange={(e) => setFilterDay(e.target.value)}><option>All</option>{DAYS.map((d) => <option key={d}>{d}</option>)}</select></div>
          </div>

          {loading ? <div className="card tt-empty"><div className="tt-loader" />Loading live timetable...</div> : filtered.length === 0 ? <div className="card tt-empty"><div className="tt-empty-icon">◫</div><h3>No classes found</h3><p>Use the schedule builder to add a class, or change your search/filter.</p></div> : grouped.map(({ day, classes }) => classes.length > 0 && (
            <section className="card tt-day" key={day}>
              <div className="tt-day-head"><div><span className="tt-day-dot" />{day}</div><span>{classes.length} {classes.length === 1 ? "class" : "classes"}</span></div>
              <div className="tt-class-list">
                {classes.map((c) => <article className="tt-class" key={c.id}>
                  <div className="tt-time"><strong>{formatTime(c.startTime)}</strong><span>{formatTime(c.endTime)}</span></div>
                  <div className="tt-class-main"><strong>{c.subject.name}</strong><div><span>{c.teacher?.fullName || "Teacher not assigned"}</span>{c.room && <><b>·</b><span>{c.room}</span></>}</div></div>
                  <div className="tt-class-actions"><button className="btn btn-secondary btn-sm" onClick={() => startEdit(c)}>Edit</button><button className="btn btn-danger btn-sm" onClick={() => handleDelete(c.id)}>Delete</button></div>
                </article>)}
              </div>
            </section>
          ))}
        </section>
      </div>
    </div>
  );
}
