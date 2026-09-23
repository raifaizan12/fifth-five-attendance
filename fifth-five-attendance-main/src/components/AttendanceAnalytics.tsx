"use client";

import { useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, LineChart, Line } from "recharts";

type BySubject = { subjectId: string; subjectName: string; percentage: number };
type Rec = { date: string; status: string };

const CHART_TOOLTIP_STYLE = {
  background: "rgba(10, 17, 32, 0.95)",
  border: "1px solid rgba(126, 171, 204, 0.28)",
  borderRadius: 10,
  color: "#e6edf5",
  fontSize: 12.5,
};

function getISOWeekLabel(d: Date) {
  const date = new Date(d);
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + 3 - ((date.getDay() + 6) % 7));
  const week1 = new Date(date.getFullYear(), 0, 4);
  const weekNo = 1 + Math.round(((date.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7);
  return `W${weekNo}`;
}

export default function AttendanceAnalytics({ bySubject, records }: { bySubject: BySubject[]; records: Rec[] }) {
  const weekly = useMemo(() => {
    const byWeek = new Map<string, { present: number; total: number }>();
    const sorted = [...records].sort((a, b) => (a.date < b.date ? -1 : 1));
    for (const r of sorted) {
      const d = new Date(r.date);
      const key = `${d.getFullYear()}-${getISOWeekLabel(d)}`;
      if (!byWeek.has(key)) byWeek.set(key, { present: 0, total: 0 });
      const w = byWeek.get(key)!;
      w.total += 1;
      if (r.status === "PRESENT" || r.status === "LATE") w.present += 1;
    }
    return Array.from(byWeek.entries())
      .slice(-10) // last 10 weeks with recorded classes
      .map(([key, v]) => ({
        label: key.split("-")[1],
        rate: v.total > 0 ? Math.round((v.present / v.total) * 1000) / 10 : 0,
      }));
  }, [records]);

  if (bySubject.length === 0 && weekly.length === 0) {
    return (
      <div className="card">
        <h3 style={{ marginTop: 0 }}>📊 Attendance Analytics</h3>
        <div className="hint">Analytics will appear once attendance has been recorded.</div>
      </div>
    );
  }

  return (
    <div className="card">
      <h3 style={{ marginTop: 0 }}>📊 Attendance Analytics</h3>

      {bySubject.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <p className="chart-sub" style={{ marginTop: -4 }}>Attendance % by subject</p>
          <div style={{ width: "100%", height: 200 }}>
            <ResponsiveContainer>
              <BarChart data={bySubject} margin={{ left: -18, right: 8, top: 10 }}>
                <CartesianGrid stroke="rgba(126,171,204,0.12)" vertical={false} />
                <XAxis dataKey="subjectName" tick={{ fill: "#5e7290", fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#5e7290", fontSize: 11 }} axisLine={false} tickLine={false} width={34} domain={[0, 100]} />
                <Tooltip contentStyle={CHART_TOOLTIP_STYLE} formatter={(v: number) => [`${v}%`, "Attendance"]} />
                <Bar dataKey="percentage" fill="#22d3ee" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {weekly.length > 1 && (
        <div>
          <p className="chart-sub" style={{ marginTop: -4 }}>Weekly attendance trend</p>
          <div style={{ width: "100%", height: 180 }}>
            <ResponsiveContainer>
              <LineChart data={weekly} margin={{ left: -18, right: 8, top: 10 }}>
                <CartesianGrid stroke="rgba(126,171,204,0.12)" vertical={false} />
                <XAxis dataKey="label" tick={{ fill: "#5e7290", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#5e7290", fontSize: 11 }} axisLine={false} tickLine={false} width={34} domain={[0, 100]} />
                <Tooltip contentStyle={CHART_TOOLTIP_STYLE} formatter={(v: number) => [`${v}%`, "Turnout"]} />
                <Line type="monotone" dataKey="rate" stroke="#34d399" strokeWidth={2.5} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}
