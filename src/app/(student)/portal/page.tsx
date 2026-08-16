"use client";

import { useEffect, useState } from "react";
import { signOut } from "next-auth/react";

type HistoryData = {
  records: { id: string; date: string; topic?: string | null; subject: string; teacher?: string | null; status: string }[];
  overallCounts: { total: number; present: number; absent: number; late: number; leave: number };
  overallPercentage: number;
  bySubject: { subjectId: string; subjectName: string; total: number; present: number; absent: number; late: number; leave: number; percentage: number }[];
};

function StatusBadge({ status }: { status: string }) {
  const cls = { PRESENT: "badge-present", ABSENT: "badge-absent", LATE: "badge-late", LEAVE: "badge-leave" }[status] || "";
  return <span className={`badge ${cls}`}>{status.charAt(0) + status.slice(1).toLowerCase()}</span>;
}

export default function PortalPage() {
  const [data, setData] = useState<HistoryData | null>(null);
  const [threshold, setThreshold] = useState(75);
  const [loading, setLoading] = useState(true);
  const [subjectFilter, setSubjectFilter] = useState("");

  useEffect(() => {
    Promise.all([
      fetch(`/api/attendance/history${subjectFilter ? `?subjectId=${subjectFilter}` : ""}`).then((r) => r.json()),
      fetch("/api/settings").then((r) => r.json()),
    ]).then(([hist, settings]) => {
      setData(hist);
      setThreshold(settings.settings?.attendanceThreshold ?? 75);
      setLoading(false);
    });
  }, [subjectFilter]);

  return (
    <div>
      <div className="topbar">
        <div className="topbar-inner">
          <div>
            <h1>My Attendance</h1>
            <div className="sub">BS IT · Fifth Five · IUB</div>
          </div>
          <button className="logout-btn" onClick={() => signOut({ callbackUrl: "/login" })}>Log out</button>
        </div>
      </div>

      <div className="page">
        {loading || !data ? (
          <div className="card">Loading your attendance...</div>
        ) : (
          <>
            <div className="card">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div className="hint">Overall Attendance</div>
                  <div style={{ fontSize: 32, fontWeight: 700, color: data.overallPercentage < threshold ? "var(--red)" : "var(--navy)" }}>
                    {data.overallPercentage}%
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div className="hint">Threshold: {threshold}%</div>
                  {data.overallPercentage < threshold && <div className="error-text">Below required threshold</div>}
                </div>
              </div>
              <div className="progress-bar-outer" style={{ marginTop: 10 }}>
                <div
                  className="progress-bar-inner"
                  style={{ width: `${Math.min(data.overallPercentage, 100)}%`, background: data.overallPercentage < threshold ? "var(--red)" : "var(--green)" }}
                />
              </div>
              <div className="hint" style={{ marginTop: 10 }}>
                Present: {data.overallCounts.present} · Absent: {data.overallCounts.absent} · Late: {data.overallCounts.late} · Leave: {data.overallCounts.leave}
              </div>
            </div>

            <div className="card">
              <h3 style={{ marginTop: 0 }}>Subject-wise Attendance</h3>
              <div className="table-wrap">
                <table>
                  <thead><tr><th>Subject</th><th>Present</th><th>Absent</th><th>Late</th><th>Leave</th><th>%</th></tr></thead>
                  <tbody>
                    {data.bySubject.map((s) => (
                      <tr key={s.subjectId}>
                        <td>{s.subjectName}</td>
                        <td>{s.present}</td>
                        <td>{s.absent}</td>
                        <td>{s.late}</td>
                        <td>{s.leave}</td>
                        <td><span className={`badge ${s.percentage < threshold ? "badge-absent" : "badge-present"}`}>{s.percentage}%</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="card">
              <h3 style={{ marginTop: 0 }}>Attendance History</h3>
              <div className="field">
                <label>Filter by subject</label>
                <select value={subjectFilter} onChange={(e) => setSubjectFilter(e.target.value)}>
                  <option value="">All subjects</option>
                  {data.bySubject.map((s) => <option key={s.subjectId} value={s.subjectId}>{s.subjectName}</option>)}
                </select>
              </div>
              <div className="table-wrap">
                <table>
                  <thead><tr><th>Date</th><th>Subject</th><th>Status</th></tr></thead>
                  <tbody>
                    {data.records.map((r) => (
                      <tr key={r.id}>
                        <td>{new Date(r.date).toLocaleDateString()}</td>
                        <td>{r.subject}{r.topic && r.topic !== "General" ? ` — ${r.topic}` : ""}</td>
                        <td><StatusBadge status={r.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {data.records.length === 0 && <div className="hint">No attendance recorded yet.</div>}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
