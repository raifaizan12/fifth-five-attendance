"use client";

import { useEffect, useMemo, useState } from "react";
import { signOut } from "next-auth/react";
import BrandMark from "@/components/BrandMark";
import CountUp from "@/components/CountUp";
import Confetti from "@/components/Confetti";
import ShareCard from "@/components/ShareCard";

type HistoryData = {
  records: { id: string; date: string; topic?: string | null; subject: string; teacher?: string | null; status: string }[];
  overallCounts: { total: number; present: number; absent: number; late: number; leave: number };
  overallPercentage: number;
  bySubject: { subjectId: string; subjectName: string; total: number; present: number; absent: number; late: number; leave: number; percentage: number }[];
};

type LeaderboardRow = { rank: number; fullName: string; iubId: string; percentage: number; present: number; streak: number };
type LeaderboardData = { podium: LeaderboardRow[]; totalStudents: number; longestStreak: number; me: LeaderboardRow | null };
type Subject = { id: string; name: string; code?: string | null; semester?: string | null; teacher?: { fullName: string; email?: string | null } | null };

function StatusBadge({ status }: { status: string }) {
  const cls = { PRESENT: "badge-present", ABSENT: "badge-absent", LATE: "badge-late", LEAVE: "badge-leave" }[status] || "";
  return <span className={`badge ${cls}`}>{status.charAt(0) + status.slice(1).toLowerCase()}</span>;
}

function buildHeatmap(records: { date: string; status: string }[]) {
  const byDay = new Map<string, string>();
  for (const r of records) {
    const key = new Date(r.date).toISOString().slice(0, 10);
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
  const [error, setError] = useState<string | null>(null);
  const [subjectFilter, setSubjectFilter] = useState("");
  const [board, setBoard] = useState<LeaderboardData | null>(null);
  const [celebrate, setCelebrate] = useState(false);
  const [subjects, setSubjects] = useState<Subject[]>([]);

  useEffect(() => {
    setLoading(true);
    setError(null);
    Promise.all([
      fetch(`/api/attendance/history${subjectFilter ? `?subjectId=${subjectFilter}` : ""}`),
      fetch("/api/settings"),
    ])
      .then(async ([histRes, settingsRes]) => {
        if (!histRes.ok) {
          const body = await histRes.json().catch(() => ({}));
          throw new Error(body.error || `History request failed (${histRes.status})`);
        }
        if (!settingsRes.ok) {
          const body = await settingsRes.json().catch(() => ({}));
          throw new Error(body.error || `Settings request failed (${settingsRes.status})`);
        }

        const hist: HistoryData = await histRes.json();
        const settings = await settingsRes.json();

        setData(hist);
        setThreshold(settings.settings?.attendanceThreshold ?? 75);
      })
      .catch((e: unknown) => {
        setError(e instanceof Error ? e.message : "Something went wrong loading your attendance.");
      })
      .finally(() => setLoading(false));
  }, [subjectFilter]);

  useEffect(() => {
    fetch("/api/leaderboard")
      .then((r) => (r.ok ? r.json() : null))
      .then((lb) => {
        if (!lb) return;
        setBoard(lb);
        if (lb?.me && (lb.me.rank <= 3 || lb.me.percentage >= 90)) {
          setTimeout(() => setCelebrate(true), 400);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetch("/api/subjects")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setSubjects(d?.subjects || []))
      .catch(() => {});
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
        {loading ? (
          <div className="card">Loading your attendance...</div>
        ) : error ? (
          <div className="card">
            <div className="error-text">Couldn't load your attendance: {error}</div>
            <button className="logout-btn" style={{ marginTop: 12 }} onClick={() => setSubjectFilter((f) => f)}>
              Try again
            </button>
          </div>
        ) : !data ? (
          <div className="card">No attendance data available yet.</div>
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
                        :
