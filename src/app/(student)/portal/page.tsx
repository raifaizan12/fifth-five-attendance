"use client";

import { useEffect, useMemo, useState } from "react";
import { signOut } from "next-auth/react";
import BrandMark from "@/components/BrandMark";
import CountUp from "@/components/CountUp";
import Confetti from "@/components/Confetti";

type HistoryData = {
  records: { id: string; date: string; topic?: string | null; subject: string; teacher?: string | null; status: string }[];
  overallCounts: { total: number; present: number; absent: number; late: number; leave: number };
  overallPercentage: number;
  bySubject: { subjectId: string; subjectName: string; total: number; present: number; absent: number; late: number; leave: number; percentage: number }[];
};

type LeaderboardRow = { rank: number; fullName: string; iubId: string; percentage: number; present: number };
type LeaderboardData = { podium: LeaderboardRow[]; totalStudents: number; me: LeaderboardRow | null };

function StatusBadge({ status }: { status: string }) {
  const cls = { PRESENT: "badge-present", ABSENT: "badge-absent", LATE: "badge-late", LEAVE: "badge-leave" }[status] || "";
  return <span className={`badge ${cls}`}>{status.charAt(0) + status.slice(1).toLowerCase()}</span>;
}

// GitHub-style contribution grid: one cell per day, most recent 18 weeks,
// colored by that day's attendance status (skips days with no class).
function buildHeatmap(records: { date: string; status: string }[]) {
  const byDay = new Map<string, string>();
  for (const r of records) {
    const key = new Date(r.date).toISOString().slice(0, 10);
    // PRESENT beats LATE beats LEAVE beats ABSENT if more than one class that day
    const rank: Record<string, number> = { PRESENT: 3, LATE: 2, LEAVE: 1, ABSENT: 0 };
    const existing = byDay.get(key);
    if (!existing || rank[r.status] > rank[existing]) byDay.set(key, r.status);
  }

  const weeks = 18;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const start = new Date(today);
  start.setDate(start.getDate() - (weeks * 7 - 1) - today.getDay());

  const cols: { date: string; level: string | null }[][] = [];
  const cursor = new Date(start);
  for (let w = 0; w < weeks + 1; w++) {
    const col: { date: string; level: string | null }[] = [];
    for (let d = 0; d < 7; d++) {
      const key = cursor.toISOString().slice(0, 10);
      const status = byDay.get(key);
      col.push({ date: key, level: status ? status.toLowerCase() : cursor > today ? "future" : null });
      cursor.setDate(cursor.getDate() + 1);
    }
    cols.push(col);
  }
  return cols;
}

export default function PortalPage() {
  const [data, setData] = useState<HistoryData | null>(null);
  const [threshold, setThreshold] = useState(75);
  const [loading, setLoading] = useState(true);
  const [subjectFilter, setSubjectFilter] = useState("");
  const [board, setBoard] = useState<LeaderboardData | null>(null);
  const [celebrate, setCelebrate] = useState(false);

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

  useEffect(() => {
    fetch("/api/leaderboard").then((r) => r.json()).then((lb) => {
      setBoard(lb);
      if (lb?.me && (lb.me.rank <= 3 || lb.me.percentage >= 90)) {
        setTimeout(() => setCelebrate(true), 400);
      }
    });
  }, []);

  const heatmap = useMemo(() => buildHeatmap(data?.records || []), [data]);

  return (
    <div>
      <div className="topbar">
        <div className="topbar-inner">
          <div>
            <BrandMark />
            <div>
              <h1>My Attendance</h1>
              <div className="sub">BS IT · Fifth Five · IUB</div>
            </div>
          </div>
          <button className="logout-btn" onClick={() => signOut({ callbackUrl: "/login" })}>Log out</button>
        </div>
      </div>

      <Confetti fire={celebrate} />

      <div className="page">
        {loading || !data ? (
          <div className="card">Loading your attendance...</div>
        ) : (
          <>
            {board?.me && (
              <div className="card">
                <div className="rank-hero">
                  <div style={{ fontSize: 34 }}>
                    {board.me.rank === 1 ? "🥇" : board.me.rank === 2 ? "🥈" : board.me.rank === 3 ? "🥉" : "🎯"}
                  </div>
                  <div>
                    <div className="big">
                      #<CountUp value={board.me.rank} /> <span style={{ fontSize: 16, color: "var(--ink-faint)" }}>of {board.totalStudents}</span>
                    </div>
                    <div className="sub">
                      {board.me.rank <= 3
                        ? "You're on the podium for the class!"
                        : board.me.percentage >= 90
                        ? "Top-tier attendance — keep it up."
                        : `Top ${Math.max(1, Math.round((board.me.rank / board.totalStudents) * 100))}% of the class`}
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="card">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div className="hint">Overall Attendance</div>
                  <div style={{ fontSize: 32, fontWeight: 800, fontFamily: "Sora, sans-serif", color: data.overallPercentage < threshold ? "var(--red)" : "var(--cyan-soft)" }}>
                    <CountUp value={data.overallPercentage} suffix="%" />
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
              {data.overallPercentage < threshold && data.overallCounts.total > 0 && (() => {
                // How many more PRESENT classes in a row would it take to reach the threshold,
                // assuming every future class is attended and the denominator grows by one each time.
                const { present, late, absent } = data.overallCounts;
                const attended = present + late;
                const denom = attended + absent;
                let needed = 0;
                let a = attended, d = denom;
                while (d === 0 || (a / d) * 100 < threshold) {
                  a += 1; d += 1; needed += 1;
                  if (needed > 500) break;
                }
                return (
                  <div className="hint" style={{ marginTop: 8, color: "var(--amber-soft)" }}>
                    Attending the next {needed} class{needed === 1 ? "" : "es"} in a row brings you back to {threshold}%.
                  </div>
                );
              })()}
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
                        <td>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 110 }}>
                            <span className={`badge ${s.percentage < threshold ? "badge-absent" : "badge-present"}`}>{s.percentage}%</span>
                            <div className="progress-bar-outer" style={{ flex: 1, height: 5 }}>
                              <div
                                className="progress-bar-inner"
                                style={{ width: `${Math.min(s.percentage, 100)}%`, background: s.percentage < threshold ? "var(--red)" : "var(--green)" }}
                              />
                            </div>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="card">
              <h3 style={{ marginTop: 0 }}>Your Attendance Calendar</h3>
              <p className="chart-sub" style={{ marginTop: -6 }}>Every class day, at a glance — like a contribution graph for showing up</p>
              <div className="heatmap-scroll">
                <div className="heatmap-grid">
                  {heatmap.map((col, ci) => (
                    <div key={ci} style={{ display: "grid", gridTemplateRows: "repeat(7, 13px)", gap: 3 }}>
                      {col.map((day, di) => (
                        <div
                          key={di}
                          className="heatmap-cell"
                          data-level={day.level === "future" ? undefined : day.level || undefined}
                          title={day.level && day.level !== "future" ? `${day.date}: ${day.level}` : day.date}
                        />
                      ))}
                    </div>
                  ))}
                </div>
              </div>
              <div className="heatmap-legend">
                <span className="heatmap-cell" data-level="present" /> Present
                <span className="heatmap-cell" data-level="late" style={{ marginLeft: 8 }} /> Late
                <span className="heatmap-cell" data-level="leave" style={{ marginLeft: 8 }} /> Leave
                <span className="heatmap-cell" data-level="absent" style={{ marginLeft: 8 }} /> Absent
              </div>
            </div>

            {board && board.podium.length > 0 && (
              <div className="card">
                <h3 style={{ marginTop: 0 }}>🏆 Class Leaderboard</h3>
                {board.podium.map((r) => (
                  <div key={r.iubId} className={`leaderboard-row ${board.me?.iubId === r.iubId ? "me" : ""}`}>
                    <span className={`lb-rank ${r.rank === 1 ? "top1" : r.rank === 2 ? "top2" : r.rank === 3 ? "top3" : ""}`}>
                      {r.rank === 1 ? "🥇" : r.rank === 2 ? "🥈" : r.rank === 3 ? "🥉" : r.rank}
                    </span>
                    <span className="lb-name">{r.fullName}{board.me?.iubId === r.iubId ? " (you)" : ""}</span>
                    <span className="lb-pct"><CountUp value={r.percentage} suffix="%" /></span>
                  </div>
                ))}
              </div>
            )}

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

