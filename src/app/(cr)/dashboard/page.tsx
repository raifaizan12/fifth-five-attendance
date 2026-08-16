"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

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
};

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [studentsRes, settingsRes, sessionsRes, reportsRes] = await Promise.all([
        fetch("/api/students").then((r) => r.json()),
        fetch("/api/settings").then((r) => r.json()),
        fetch("/api/attendance/sessions?limit=5").then((r) => r.json()),
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

      setData({
        totalStudents,
        todayPresent,
        todayAbsent,
        todayLate,
        todayLeave,
        overallPercentage,
        threshold,
        belowThreshold,
        recentSessions: (sessionsRes.sessions || []).map((s: any) => ({
          id: s.id,
          date: s.date,
          subject: s.subject,
          present: s.present,
          total: s.total,
        })),
      });
      setLoading(false);
    }
    load();
  }, []);

  if (loading || !data) return <div className="card">Loading dashboard...</div>;

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
              {data.recentSessions.map((s) => (
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
