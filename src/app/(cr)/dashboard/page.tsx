"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

type DashboardData = {
  totalStudents: number;
  todayPresent: number;
  todayAbsent: number;
  todayLate: number;
  todayLeave: number;
  overallPercentage: number;
  threshold: number;
  belowThreshold: { fullName: string; iubId: string; percentage: number }[];
  recentSessions: { id: string; date: string; subject: string; present: number; total: number }[];
  bucketCounts: { name: string; value: number; color: string }[];
};

const CHART_TOOLTIP_STYLE = {
  background: "rgba(10, 17, 32, 0.95)",
  border: "1px solid rgba(126, 171, 204, 0.28)",
  borderRadius: 10,
  color: "#e6edf5",
  fontSize: 12.5,
};

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [studentsRes, settingsRes, sessionsRes, reportsRes] = await Promise.all([
        fetch("/api/students").then((r) => r.json()),
        fetch("/api/settings").then((r) => r.json()),
        fetch("/api/attendance/sessions?limit=10").then((r) => r.json()),
        fetch("/api/reports").then((r) => r.json()),
      ]);

      const totalStudents = studentsRes.students?.length || 0;
      const threshold = settingsRes.settings?.attendanceThreshold ?? 75;
      const summary: any[] = reportsRes.summary || [];

      const overallPercentage =
        summary.length > 0 ? Math.round((summary.reduce((a, s) => a + s.percentage, 0) / summary.length) * 10) / 10 : 0;

      const belowThreshold = summary
        .filter((s) => s.percentage < threshold)
        .sort((a, b) => a.percentage - b.percentage)
        .slice(0, 8)
        .map((s) => ({ fullName: s.fullName, iubId: s.iubId, percentage: s.percentage }));

      const today = new Date().toISOString().slice(0, 10);
      const todaySessions = (sessionsRes.sessions || []).filter((s: any) => s.date.slice(0, 10) === today);
      const todayPresent = todaySessions.reduce((a: number, s: any) => a + s.present, 0);
      const todayAbsent = todaySessions.reduce((a: number, s: any) => a + s.absent, 0);
      const todayLate = todaySessions.reduce((a: number, s: any) => a + s.late, 0);
      const todayLeave = todaySessions.reduce((a: number, s: any) => a + s.leave, 0);

      // Bucket every student's percentage into bands for the distribution donut
      const bands = [
        { name: "90-100%", min: 90, max: 100.01, color: "#34d399" },
        { name: "75-89%", min: 75, max: 90, color: "#22d3ee" },
        { name: "60-74%", min: 60, max: 75, color: "#fbbf24" },
        { name: "Below 60%", min: 0, max: 60, color: "#fb7185" },
      ];
      const bucketCounts = bands.map((b) => ({
        name: b.name,
        color: b.color,
        value: summary.filter((s) => s.percentage >= b.min && s.percentage < b.max).length,
      }));

      setData({
        totalStudents,
        todayPresent,
        todayAbsent,
        todayLate,
        todayLeave,
        overallPercentage,
        threshold,
        belowThreshold,
        recentSessions: (sessionsRes.sessions || [])
          .slice()
          .reverse()
          .map((s: any) => ({ id: s.id, date: s.date, subject: s.subject, present: s.present, total: s.total })),
        bucketCounts,
      });
      setLoading(false);
    }
    load();
  }, []);

  const trendData = useMemo(
    () =>
      (data?.recentSessions || []).map((s) => ({
        label: new Date(s.date).toLocaleDateString("en-GB", { day: "2-digit", month: "short" }),
        rate: s.total > 0 ? Math.round((s.present / s.total) * 1000) / 10 : 0,
      })),
    [data]
  );

  const trendDelta = useMemo(() => {
    if (trendData.length < 2) return null;
    const last = trendData[trendData.length - 1].rate;
    const prev = trendData[trendData.length - 2].rate;
    return Math.round((last - prev) * 10) / 10;
  }, [trendData]);

  if (loading || !data) return <div className="card">Loading dashboard...</div>;

  const hasDistribution = data.bucketCounts.some((b) => b.value > 0);

  return (
    <div>
      <div className="stat-grid">
        <div className="stat-card">
          <div className="label">Total Students</div>
          <div className="value">{data.totalStudents}</div>
        </div>
        <div className="stat-card">
          <div className="label">Today Present</div>
          <div className="value">{data.todayPresent}</div>
        </div>
        <div className="stat-card">
          <div className="label">Today Absent</div>
          <div className="value">{data.todayAbsent}</div>
        </div>
        <div className="stat-card">
          <div className="label">Overall Attendance</div>
          <div className="value">{data.overallPercentage}%</div>
        </div>
      </div>

      <div className="stat-grid">
        <div className="stat-card">
          <div className="label">Today Late</div>
          <div className="value">{data.todayLate}</div>
        </div>
        <div className="stat-card">
          <div className="label">Today Leave</div>
          <div className="value">{data.todayLeave}</div>
        </div>
        <div className="stat-card warn">
          <div className="label">Below {data.threshold}% Threshold</div>
          <div className="value">{data.belowThreshold.length}</div>
        </div>
        <div className="stat-card">
          <div className="label">Quick Action</div>
          <Link href="/attendance"><button className="btn btn-primary btn-sm" style={{ marginTop: 4 }}>Mark Attendance</button></Link>
        </div>
      </div>

      {trendData.length > 1 && (
        <div className="card chart-card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 8 }}>
            <div>
              <p className="chart-title">Attendance trend</p>
              <p className="chart-sub">Turnout rate across the last {trendData.length} sessions held</p>
            </div>
            {trendDelta !== null && (
              <span className={`chip ${trendDelta > 0 ? "chip-up" : trendDelta < 0 ? "chip-down" : "chip-flat"}`}>
                {trendDelta > 0 ? "▲" : trendDelta < 0 ? "▼" : "–"} {Math.abs(trendDelta)}% vs previous class
              </span>
            )}
          </div>
          <div style={{ width: "100%", height: 200, marginTop: 4 }}>
            <ResponsiveContainer>
              <AreaChart data={trendData} margin={{ left: -18, right: 8, top: 10 }}>
                <defs>
                  <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#22d3ee" stopOpacity={0.45} />
                    <stop offset="100%" stopColor="#22d3ee" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="rgba(126,171,204,0.12)" vertical={false} />
                <XAxis dataKey="label" tick={{ fill: "#5e7290", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#5e7290", fontSize: 11 }} axisLine={false} tickLine={false} width={34} domain={[0, 100]} />
                <Tooltip contentStyle={CHART_TOOLTIP_STYLE} formatter={(v: number) => [`${v}%`, "Turnout"]} />
                <Area type="monotone" dataKey="rate" stroke="#22d3ee" strokeWidth={2.5} fill="url(#trendFill)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {hasDistribution && (
        <div className="card chart-card">
          <p className="chart-title">Where the class stands</p>
          <p className="chart-sub">Every student, grouped by attendance percentage band</p>
          <div style={{ width: "100%", height: 220 }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie data={data.bucketCounts} dataKey="value" nameKey="name" innerRadius={55} outerRadius={82} paddingAngle={3}>
                  {data.bucketCounts.map((b) => (
                    <Cell key={b.name} fill={b.color} stroke="rgba(6,11,20,0.6)" strokeWidth={2} />
                  ))}
                </Pie>
                <Tooltip contentStyle={CHART_TOOLTIP_STYLE} formatter={(v: number, n: string) => [`${v} student${v === 1 ? "" : "s"}`, n]} />
                <Legend
                  layout="vertical"
                  verticalAlign="middle"
                  align="right"
                  iconType="circle"
                  wrapperStyle={{ fontSize: 12, color: "#9db0c6" }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {data.belowThreshold.length > 0 && (
        <div className="card">
          <h3 style={{ marginTop: 0 }}>Students Below Attendance Threshold</h3>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Name</th><th>IUB ID</th><th>Percentage</th></tr></thead>
              <tbody>
                {data.belowThreshold.map((s) => (
                  <tr key={s.iubId}>
                    <td>{s.fullName}</td>
                    <td>{s.iubId}</td>
                    <td><span className="badge badge-absent">{s.percentage}%</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Recent Attendance Sessions</h3>
        {data.recentSessions.length === 0 && <div className="hint">No attendance has been marked yet.</div>}
        <div className="table-wrap">
          <table>
            <thead><tr><th>Date</th><th>Subject</th><th>Present / Total</th></tr></thead>
            <tbody>
              {data.recentSessions.slice().reverse().map((s) => (
                <tr key={s.id}>
                  <td>{new Date(s.date).toLocaleDateString()}</td>
                  <td>{s.subject}</td>
                  <td>{s.present} / {s.total}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
