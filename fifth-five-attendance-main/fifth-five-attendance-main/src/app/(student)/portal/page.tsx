"use client";

import { useEffect, useMemo, useState } from "react";
import { signOut } from "next-auth/react";
import Link from "next/link";
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
type Photo = { id: string; caption?: string | null; imageData: string };
type HubItem = any;
type MeData = { user: { role: string; student?: { fullName: string; iubId: string; regNumber: string; semester: string; program: string; section: string; email?: string | null } } };


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

function PhotoSlider({ photos }: { photos: Photo[] }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (photos.length < 2) return;
    const t = setInterval(() => setIndex((i) => (i + 1) % photos.length), 5000);
    return () => clearInterval(t);
  }, [photos.length]);

  if (photos.length === 0) return null;

  return (
    <div className="card" style={{ padding: 0, overflow: "hidden" }}>
      <div style={{ position: "relative", width: "100%", aspectRatio: "16 / 8", background: "#0a1120" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={photos[index].imageData}
          alt={photos[index].caption || "Class photo"}
          style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
        />
        {photos[index].caption && (
          <div
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              bottom: 0,
              padding: "10px 14px",
              background: "linear-gradient(to top, rgba(0,0,0,0.65), transparent)",
              color: "#fff",
              fontSize: 13,
            }}
          >
            {photos[index].caption}
          </div>
        )}
        {photos.length > 1 && (
          <>
            <button
              onClick={() => setIndex((i) => (i - 1 + photos.length) % photos.length)}
              aria-label="Previous photo"
              style={{
                position: "absolute", top: "50%", left: 8, transform: "translateY(-50%)",
                background: "rgba(0,0,0,0.4)", color: "#fff", border: "none", borderRadius: "50%",
                width: 30, height: 30, cursor: "pointer", fontSize: 16, lineHeight: "30px",
              }}
            >
              ‹
            </button>
            <button
              onClick={() => setIndex((i) => (i + 1) % photos.length)}
              aria-label="Next photo"
              style={{
                position: "absolute", top: "50%", right: 8, transform: "translateY(-50%)",
                background: "rgba(0,0,0,0.4)", color: "#fff", border: "none", borderRadius: "50%",
                width: 30, height: 30, cursor: "pointer", fontSize: 16, lineHeight: "30px",
              }}
            >
              ›
            </button>
            <div style={{ position: "absolute", bottom: 8, left: "50%", transform: "translateX(-50%)", display: "flex", gap: 5 }}>
              {photos.map((_, i) => (
                <span
                  key={i}
                  onClick={() => setIndex(i)}
                  style={{
                    width: 6, height: 6, borderRadius: "50%", cursor: "pointer",
                    background: i === index ? "#fff" : "rgba(255,255,255,0.4)",
                  }}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function ClassHubStudent({ hub }: { hub: { announcements: HubItem[]; assignments: HubItem[]; exams: HubItem[]; materials: HubItem[]; polls: HubItem[] } }) {
  const [pollMsg, setPollMsg] = useState("");
  async function vote(id: string, option: string) {
    const r = await fetch(`/api/class-hub?type=polls&id=${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ option }) });
    const d = await r.json().catch(() => ({})); setPollMsg(r.ok ? "Vote saved ✓" : (d.error || "Could not vote"));
  }
  const has = hub.announcements.length || hub.assignments.length || hub.exams.length || hub.materials.length || hub.polls.length;
  if (!has) return null;
  return <div className="hub-grid">
    {hub.announcements.length > 0 && <div className="card hub-card"><h3>📢 Announcements</h3>{hub.announcements.slice(0,5).map((x:any)=><div className="hub-item" key={x.id}><div className="hub-title">{x.pinned ? "📌 " : ""}{x.title}</div><span className="chip chip-flat">{x.priority}</span><p>{x.body}</p></div>)}</div>}
    {hub.assignments.length > 0 && <div className="card hub-card"><h3>📝 Assignments</h3>{hub.assignments.slice(0,6).map((x:any)=><div className="hub-item" key={x.id}><div className="hub-title">{x.title}</div><div className="hub-meta">{x.subject || "Class"} · Due {new Date(x.dueDate).toLocaleString()}</div>{x.description && <p>{x.description}</p>}</div>)}</div>}
    {hub.exams.length > 0 && <div className="card hub-card"><h3>📅 Exams & Quizzes</h3>{hub.exams.slice(0,6).map((x:any)=><div className="hub-item" key={x.id}><div className="hub-title">{x.title}</div><div className="hub-meta">{x.subject} · {new Date(x.date).toLocaleDateString()} {x.startTime || ""} {x.room ? `· ${x.room}` : ""}</div></div>)}</div>}
    {hub.materials.length > 0 && <div className="card hub-card"><h3>📚 Study Materials</h3>{hub.materials.slice(0,8).map((x:any)=><div className="hub-item" key={x.id}><a className="hub-title" href={x.url} target="_blank" rel="noreferrer">{x.title} ↗</a><div className="hub-meta">{x.subject || "General"}</div>{x.description && <p>{x.description}</p>}</div>)}</div>}
    {hub.polls.length > 0 && <div className="card hub-card"><h3>🗳️ Class Polls</h3>{hub.polls.filter((x:any)=>x.active).slice(0,4).map((x:any)=><div className="hub-item" key={x.id}><div className="hub-title">{x.question}</div>{x.myVote ? <div className="success-text">✓ You voted: <strong>{x.myVote}</strong></div> : <div className="poll-options">{x.options.map((o:string)=><button className="btn btn-secondary btn-sm" key={o} onClick={()=>vote(x.id,o)}>{o}</button>)}</div>}</div>)}{pollMsg&&<div className="success-text">{pollMsg}</div>}</div>}
  </div>;
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
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [hub, setHub] = useState<{announcements: HubItem[]; assignments: HubItem[]; exams: HubItem[]; materials: HubItem[]; polls: HubItem[]}>({ announcements: [], assignments: [], exams: [], materials: [], polls: [] });
  const [me, setMe] = useState<MeData | null>(null);

  useEffect(() => {
    fetch("/api/me").then((r) => (r.ok ? r.json() : null)).then((d) => setMe(d)).catch(() => {});
  }, []);

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

  useEffect(() => {
    fetch("/api/photos")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setPhotos(d?.photos || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    const types = ["announcements", "assignments", "exams", "materials", "polls"];
    Promise.all(types.map((t) => fetch(`/api/class-hub?type=${t}`).then((r) => r.ok ? r.json() : { items: [] })))
      .then((all) => setHub({ announcements: all[0].items || [], assignments: all[1].items || [], exams: all[2].items || [], materials: all[3].items || [], polls: all[4].items || [] }))
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
        {me?.user?.student && (
          <div className="card" style={{ marginBottom: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap", alignItems: "center" }}>
              <div>
                <div className="hint">STUDENT PROFILE</div>
                <h2 style={{ margin: "4px 0 6px" }}>{me.user.student.fullName}</h2>
                <div className="sub">Roll No: <strong>{me.user.student.iubId}</strong> · Reg No: <strong>{me.user.student.regNumber}</strong></div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div className="chip chip-flat">{me.user.student.section}</div>
                <div className="hint" style={{ marginTop: 6 }}>{me.user.student.program}</div>
              </div>
            </div>
          </div>
        )}

        <PhotoSlider photos={photos} />

        <ClassHubStudent hub={hub} />

        <div className="card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <div>
          <h3 style={{ margin: 0 }}>📅 Class Timetable</h3>
          <div className="hint">View the latest timetable managed by your CR.</div>
        </div>
        <Link href="/portal/schedule">
          <button className="btn btn-primary btn-sm">View Timetable</button>
        </Link>
      </div>

      {loading ? (
          <div className="card">Loading your attendance...</div>
        ) : error ? (
          <div className="card">
            <div className="error-text">Couldn't load your attendance: {error}</div>
            <button
              className="logout-btn"
              style={{ marginTop: 12 }}
              onClick={() => setSubjectFilter((f) => f)}
            >
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
                        : board.me.percentage >= 90
                        ? "Top-tier attendance — keep it up."
                        : `Top ${Math.max(1, Math.round((board.me.rank / board.totalStudents) * 100))}% of the class`}
                    </div>
                  </div>
                </div>
                {board.me.streak >= 2 && (
                  <div className="chip chip-up" style={{ marginTop: 12 }}>
                    🔥 {board.me.streak}-class streak
                    {board.me.streak === board.longestStreak && board.longestStreak > 1 ? " — longest in class!" : ""}
                  </div>
                )}
                <div style={{ marginTop: 16 }}>
                  <ShareCard
                    data={{
                      fullName: board.me.fullName,
                      iubId: board.me.iubId,
                      percentage: board.me.percentage,
                      rank: board.me.rank,
                      totalStudents: board.totalStudents,
                      streak: board.me.streak,
                    }}
                  />
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

            {subjects.length > 0 && (
              <div className="card">
                <h3 style={{ marginTop: 0 }}>My Subjects &amp; Teachers</h3>
                <div className="table-wrap">
                  <table>
                    <thead><tr><th>Subject</th><th>Code</th><th>Teacher</th></tr></thead>
                    <tbody>
                      {subjects.map((s) => (
                        <tr key={s.id}>
                          <td>{s.name}</td>
                          <td>{s.code || "—"}</td>
                          <td>{s.teacher?.fullName || <span className="hint">Not assigned</span>}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

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
                    <span className="lb-name">{r.fullName}{board.me?.iubId === r.iubId ? " (you)" : ""}{r.streak >= 3 ? " 🔥" : ""}</span>
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
