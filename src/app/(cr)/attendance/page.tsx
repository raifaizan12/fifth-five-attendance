"use client";

import { useEffect, useState } from "react";

type Subject = { id: string; name: string; teacherId?: string | null };
type Teacher = { id: string; fullName: string };
type RosterStudent = { id: string; fullName: string; iubId: string; existingStatus: string | null };
type Status = "PRESENT" | "ABSENT" | "LATE" | "LEAVE";

const STATUSES: Status[] = ["PRESENT", "ABSENT", "LATE", "LEAVE"];

export default function AttendancePage() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [subjectId, setSubjectId] = useState("");
  const [teacherId, setTeacherId] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [topic, setTopic] = useState("");
  const [roster, setRoster] = useState<RosterStudent[]>([]);
  const [statuses, setStatuses] = useState<Record<string, Status>>({});
  const [loadingRoster, setLoadingRoster] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    Promise.all([fetch("/api/subjects").then((r) => r.json()), fetch("/api/teachers").then((r) => r.json())]).then(([s, t]) => {
      setSubjects(s.subjects || []);
      setTeachers(t.teachers || []);
    });
  }, []);

  useEffect(() => {
    if (subjects.length && subjectId) {
      const subj = subjects.find((s) => s.id === subjectId);
      if (subj?.teacherId) setTeacherId(subj.teacherId);
    }
  }, [subjectId, subjects]);

  async function loadRoster() {
    if (!subjectId || !date) return;
    setLoadingRoster(true);
    setMessage("");
    const params = new URLSearchParams({ subjectId, date, topic: topic || "General" });
    const res = await fetch(`/api/attendance/roster?${params}`);
    const data = await res.json();
    setRoster(data.students || []);
    const initial: Record<string, Status> = {};
    for (const st of data.students || []) {
      initial[st.id] = (st.existingStatus as Status) || "PRESENT";
    }
    setStatuses(initial);
    setLoadingRoster(false);
  }

  function markAllPresent() {
    const next: Record<string, Status> = {};
    for (const s of roster) next[s.id] = "PRESENT";
    setStatuses(next);
  }

  function setStatus(studentId: string, status: Status) {
    setStatuses((prev) => ({ ...prev, [studentId]: status }));
  }

  async function saveAttendance() {
    setSaving(true);
    setMessage("");
    const records = roster.map((s) => ({ studentId: s.id, status: statuses[s.id] || "PRESENT" }));
    const res = await fetch("/api/attendance/mark", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subjectId, teacherId: teacherId || undefined, date, topic: topic || undefined, records }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) { setMessage("Error: " + (data.error || "could not save")); return; }
    setMessage(`Attendance saved for ${data.count} students.`);
  }

  const counts = STATUSES.reduce((acc, st) => {
    acc[st] = Object.values(statuses).filter((s) => s === st).length;
    return acc;
  }, {} as Record<Status, number>);

  return (
    <div>
      <div className="card">
        <h3 style={{ marginTop: 0 }}>Select Class Session</h3>
        <div className="field">
          <label>Subject</label>
          <select value={subjectId} onChange={(e) => setSubjectId(e.target.value)}>
            <option value="">-- Select Subject --</option>
            {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        <div className="field">
          <label>Teacher</label>
          <select value={teacherId} onChange={(e) => setTeacherId(e.target.value)}>
            <option value="">-- Select Teacher --</option>
            {teachers.map((t) => <option key={t.id} value={t.id}>{t.fullName}</option>)}
          </select>
        </div>
        <div className="field">
          <label>Date</label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div className="field">
          <label>Topic / Session Label (optional, default "General")</label>
          <input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="e.g. Lecture 12: Normalization" />
        </div>
        <button className="btn btn-primary btn-block" disabled={!subjectId || !date} onClick={loadRoster}>
          {loadingRoster ? "Loading students..." : "Load Student List"}
        </button>
      </div>

      {roster.length > 0 && (
        <div className="card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, flexWrap: "wrap", gap: 8 }}>
            <h3 style={{ margin: 0 }}>Students ({roster.length})</h3>
            <button className="btn btn-secondary btn-sm" onClick={markAllPresent}>Mark All Present</button>
          </div>
          <div className="hint" style={{ marginBottom: 10 }}>
            Present: {counts.PRESENT} · Absent: {counts.ABSENT} · Late: {counts.LATE} · Leave: {counts.LEAVE}
          </div>

          {roster.map((s) => (
            <div key={s.id} className="student-row" style={{ display: "block" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                <div>
                  <div className="name">{s.fullName}</div>
                  <div className="meta">{s.iubId}</div>
                </div>
              </div>
              <div className="status-picker">
                {STATUSES.map((st) => (
                  <button
                    key={st}
                    type="button"
                    className={`status-btn ${statuses[s.id] === st ? `selected-${st}` : ""}`}
                    onClick={() => setStatus(s.id, st)}
                  >
                    {st.charAt(0) + st.slice(1).toLowerCase()}
                  </button>
                ))}
              </div>
            </div>
          ))}

          {message && <div className={message.startsWith("Error") ? "error-text" : "success-text"} style={{ marginTop: 12 }}>{message}</div>}

          <button className="btn btn-primary btn-block" style={{ marginTop: 16 }} disabled={saving} onClick={saveAttendance}>
            {saving ? "Saving..." : "Save Attendance"}
          </button>
        </div>
      )}
    </div>
  );
}
