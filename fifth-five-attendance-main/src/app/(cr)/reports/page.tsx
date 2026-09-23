"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
} from "recharts";

type Subject = { id: string; name: string };
type Student = { id: string; fullName: string; iubId: string };
type SummaryRow = { studentId: string; fullName: string; iubId: string; total: number; present: number; absent: number; late: number; leave: number; percentage: number };

const CHART_TOOLTIP_STYLE = {
  background: "rgba(10, 17, 32, 0.95)",
  border: "1px solid rgba(126, 171, 204, 0.28)",
  borderRadius: 10,
  color: "#e6edf5",
  fontSize: 12.5,
};

export default function ReportsPage() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [subjectId, setSubjectId] = useState("");
  const [studentId, setStudentId] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [summary, setSummary] = useState<SummaryRow[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    Promise.all([fetch("/api/subjects").then((r) => r.json()), fetch("/api/students").then((r) => r.json())]).then(([s, st]) => {
      setSubjects(s.subjects || []);
      setStudents(st.students || []);
    });
  }, []);

  async function runReport() {
    setLoading(true);
    const params = new URLSearchParams();
    if (subjectId) params.set("subjectId", subjectId);
    if (studentId) params.set("studentId", studentId);
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    const res = await fetch(`/api/reports?${params}`);
    const data = await res.json();
    setSummary(data.summary || []);
    setLoading(false);
  }

  useEffect(() => { runReport(); }, []);

  function exportCsv() {
    const params = new URLSearchParams();
    if (subjectId) params.set("subjectId", subjectId);
    if (studentId) params.set("studentId", studentId);
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    window.open(`/api/reports/export?${params}`, "_blank");
  }

  const chartData = useMemo(
    () =>
      summary
        .slice()
        .sort((a, b) => a.percentage - b.percentage)
        .slice(0, 10)
        .map((r) => ({ name: r.fullName.split(" ")[0], full: r.fullName, percentage: r.percentage }))
        .reverse(),
    [summary]
  );

  return (
    <div>
      <div className="card">
        <h3 style={{ marginTop: 0 }}>Filters</h3>
        <div className="field">
          <label>Subject</label>
          <select value={subjectId} onChange={(e) => setSubjectId(e.target.value)}>
            <option value="">All Subjects</option>
            {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        <div className="field">
          <label>Student</label>
          <select value={studentId} onChange={(e) => setStudentId(e.target.value)}>
            <option value="">All Students</option>
            {students.map((s) => <option key={s.id} value={s.id}>{s.fullName} ({s.iubId})</option>)}
          </select>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <div className="field" style={{ flex: 1 }}><label>From</label><input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></div>
          <div className="field" style={{ flex: 1 }}><label>To</label><input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn btn-primary" onClick={runReport}>{loading ? "Loading..." : "Run Report"}</button>
          <button className="btn btn-secondary" onClick={exportCsv}>Export CSV</button>
          <button className="btn btn-secondary" onClick={() => window.print()}>Print</button>
        </div>
      </div>

      {chartData.length > 0 && (
        <div className="card chart-card no-print">
          <p className="chart-title">Lowest attendance, this filter</p>
          <p className="chart-sub">The {chartData.length} students furthest from 100% right now</p>
          <div style={{ width: "100%", height: Math.max(180, chartData.length * 34) }}>
            <ResponsiveContainer>
              <BarChart data={chartData} layout="vertical" margin={{ left: 4, right: 24 }}>
                <CartesianGrid stroke="rgba(126,171,204,0.12)" horizontal={false} />
                <XAxis type="number" domain={[0, 100]} tick={{ fill: "#5e7290", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" width={70} tick={{ fill: "#9db0c6", fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={CHART_TOOLTIP_STYLE}
                  formatter={(v: number) => [`${v}%`, "Attendance"]}
                  labelFormatter={(_, entry) => (entry?.[0]?.payload?.full as string) || ""}
                />
                <Bar dataKey="percentage" radius={[0, 6, 6, 0]} barSize={16}>
                  {chartData.map((r, i) => (
                    <Cell key={i} fill={r.percentage < 60 ? "#fb7185" : r.percentage < 75 ? "#fbbf24" : "#34d399"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Summary ({summary.length} students)</h3>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Name</th><th>IUB ID</th><th>Total</th><th>Present</th><th>Absent</th><th>Late</th><th>Leave</th><th>%</th></tr></thead>
            <tbody>
              {summary.map((r) => (
                <tr key={r.studentId}>
                  <td>{r.fullName}</td>
                  <td>{r.iubId}</td>
                  <td>{r.total}</td>
                  <td>{r.present}</td>
                  <td>{r.absent}</td>
                  <td>{r.late}</td>
                  <td>{r.leave}</td>
                  <td><span className={`badge ${r.percentage < 75 ? "badge-absent" : "badge-present"}`}>{r.percentage}%</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

