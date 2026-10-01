"use client";

import { useEffect, useMemo, useState } from "react";
import { signOut } from "next-auth/react";
import Link from "next/link";
import BrandMark from "@/components/BrandMark";
import PortalLogo from "@/components/PortalLogo";
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
type TimetableEntry = { id: string; day: string; startTime: string; endTime: string; room?: string | null; subject: { id: string; name: string }; teacher?: { fullName: string } | null };
type DiscussionPost = { id: string; message: string; createdAt: string; student: { fullName: string; iubId: string } };
type Issue = { id: string; category: string; message: string; status: string; createdAt: string };
type NotificationItem = { id: string; icon: string; title: string; meta: string; kind: string };
type PortalSettings = { portalLogoUrl?: string | null; className?: string; university?: string; program?: string; semester?: string; academicYear?: string; attendanceThreshold?: number };


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

function formatCountdown(ms: number) {
  if (ms <= 0) return "Now";
  const totalMinutes = Math.floor(ms / 60000);
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;
  if (days) return `${days}d ${hours}h`;
  if (hours) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

function TodayClasses({ entries }: { entries: TimetableEntry[] }) {
  const today = new Date().toLocaleDateString("en-US", { weekday: "long" });
  const classes = entries.filter((x) => x.day === today).sort((a, b) => a.startTime.localeCompare(b.startTime));
  return <div className="card">
    <div className="section-head"><div><h3>📅 Today's Classes</h3><div className="hint">{today} · your live class schedule</div></div><span className="chip chip-flat">{classes.length} class{classes.length === 1 ? "" : "es"}</span></div>
    {classes.length === 0 ? <div className="empty-state">No classes scheduled today 🎉</div> : <div className="today-class-list">{classes.map((c) => <div className="today-class" key={c.id}><div><strong>{c.subject.name}</strong><div className="hint">{c.teacher?.fullName || "Teacher not assigned"}{c.room ? ` · Room ${c.room}` : ""}</div></div><span className="chip chip-flat">{c.startTime}–{c.endTime}</span></div>)}</div>}
  </div>;
}

function TomorrowClasses({ entries }: { entries: TimetableEntry[] }) {
  const tomorrow = new Date(Date.now() + 86400000).toLocaleDateString("en-US", { weekday: "long" });
  const classes = entries.filter((x) => x.day === tomorrow).sort((a, b) => a.startTime.localeCompare(b.startTime));
  return <div className="card tomorrow-card">
    <div className="section-head"><div><div className="eyebrow">UP NEXT</div><h3>Tomorrow's Timetable</h3><div className="hint">{tomorrow} · managed by your CR</div></div><span className="chip chip-flat">{classes.length} class{classes.length === 1 ? "" : "es"}</span></div>
    {classes.length === 0 ? <div className="empty-state">No classes scheduled for tomorrow.</div> : <div className="tomorrow-grid">{classes.map((c) => <div className="tomorrow-class" key={c.id}><div className="time-block">{c.startTime}<span>{c.endTime}</span></div><div><strong>{c.subject.name}</strong><div className="hint">{c.teacher?.fullName || "Teacher not assigned"}{c.room ? ` · Room ${c.room}` : ""}</div></div></div>)}</div>}
  </div>;
}

function NextClass({ entries }: { entries: TimetableEntry[] }) {
  const [now, setNow] = useState(new Date());
  useEffect(() => { const t = setInterval(() => setNow(new Date()), 30000); return () => clearInterval(t); }, []);
  const day = now.toLocaleDateString("en-US", { weekday: "long" });
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const todays = entries.filter((x) => x.day === day).sort((a, b) => a.startTime.localeCompare(b.startTime));
  const next = todays.find((x) => Number(x.startTime.slice(0,2)) * 60 + Number(x.startTime.slice(3)) > currentMinutes);
  if (!next) return <div className="card"><div className="section-head"><div><h3>⏱️ Next Class</h3><div className="hint">You are done for today</div></div><span className="chip chip-up">All done ✓</span></div></div>;
  const start = Number(next.startTime.slice(0,2)) * 60 + Number(next.startTime.slice(3));
  const diff = (start - currentMinutes) * 60000 - now.getSeconds() * 1000;
  return <div className="card next-class-card"><div><div className="hint">NEXT CLASS</div><h3 style={{margin:"4px 0"}}>{next.subject.name}</h3><div className="sub">{next.startTime}–{next.endTime} · {next.room ? `Room ${next.room}` : "Room TBA"}</div></div><div className="next-countdown">{formatCountdown(diff)}</div></div>;
}

function AssignmentTracker({ assignments }: { assignments: HubItem[] }) {
  const now = Date.now();
  const sorted = [...assignments].sort((a,b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()).slice(0,8);
  return <div className="card"><div className="section-head"><div><h3>📝 Assignment Tracker</h3><div className="hint">Pending and overdue work at a glance</div></div><span className="chip chip-flat">{sorted.length} items</span></div>{sorted.length===0 ? <div className="empty-state">No assignments yet.</div> : sorted.map((a:any)=>{const overdue=new Date(a.dueDate).getTime()<now; return <div className="tracker-row" key={a.id}><div><strong>{a.title}</strong><div className="hint">{a.subject || "Class"} · Due {new Date(a.dueDate).toLocaleString()}</div></div><span className={`chip ${overdue?"chip-down":"chip-up"}`}>{overdue?"Overdue":"Pending"}</span></div>})}</div>;
}

function ExamCountdown({ exams }: { exams: HubItem[] }) {
  const upcoming = [...exams].filter((e:any)=>new Date(e.date).getTime() >= Date.now()-86400000).sort((a:any,b:any)=>new Date(a.date).getTime()-new Date(b.date).getTime())[0];
  if (!upcoming) return <div className="card"><h3>🗓️ Exam Countdown</h3><div className="empty-state">No upcoming exams added yet.</div></div>;
  const diff = Math.max(0, new Date(upcoming.date).getTime()-Date.now());
  return <div className="card"><div className="section-head"><div><div className="hint">UPCOMING {upcoming.kind || "EXAM"}</div><h3 style={{margin:"4px 0"}}>{upcoming.title}</h3><div className="sub">{upcoming.subject} · {new Date(upcoming.date).toLocaleDateString()}{upcoming.startTime ? ` · ${upcoming.startTime}` : ""}{upcoming.room ? ` · Room ${upcoming.room}` : ""}</div></div><div className="next-countdown">{formatCountdown(diff)}</div></div></div>;
}

function AttendanceCalculator({ data, threshold }: { data: HistoryData; threshold: number }) {
  const [target, setTarget] = useState(threshold);
  const [future, setFuture] = useState(0);
  const attended = data.overallCounts.present + data.overallCounts.late;
  const denominator = attended + data.overallCounts.absent;
  const after = denominator + future ? Math.round(((attended + future) / (denominator + future)) * 1000) / 10 : 0;
  let needed = 0, a = attended, d = denominator;
  while (d === 0 || (a / d) * 100 < target) { a++; d++; needed++; if (needed > 500) break; }
  return <div className="card"><div className="section-head"><div><h3>🧮 Attendance Calculator</h3><div className="hint">Plan how many upcoming classes you need to attend.</div></div></div><div className="calc-grid"><div><label className="hint">Target %</label><input type="number" min={1} max={100} value={target} onChange={e=>setTarget(Number(e.target.value)||0)} /></div><div><label className="hint">Attend next</label><input type="number" min={0} value={future} onChange={e=>setFuture(Math.max(0,Number(e.target.value)||0))} /></div><div><div className="hint">Projected attendance</div><strong className="calc-big">{after}%</strong></div><div><div className="hint">Needed to reach target</div><strong className="calc-big">{needed > 500 ? "500+" : needed}</strong></div></div></div>;
}

function NotificationCenter({ items }: { items: NotificationItem[] }) {
  const [open, setOpen] = useState(false);
  return <div className="notification-wrap"><button className="notification-btn" onClick={()=>setOpen(v=>!v)} aria-label="Notifications">🔔{items.length>0&&<span className="notification-count">{Math.min(items.length,9)}</span>}</button>{open&&<div className="notification-panel"><div className="section-head"><strong>Notifications</strong><span className="hint">{items.length} recent</span></div>{items.length===0?<div className="empty-state">You're all caught up.</div>:items.slice(0,8).map(n=><div className="notification-item" key={n.id}><span>{n.icon}</span><div><strong>{n.title}</strong><div className="hint">{n.meta}</div></div></div>)}</div>}</div>;
}

function DiscussionAndIssues() {
  const [posts,setPosts]=useState<DiscussionPost[]>([]); const [issues,setIssues]=useState<Issue[]>([]); const [message,setMessage]=useState(""); const [issue,setIssue]=useState(""); const [category,setCategory]=useState("Attendance"); const [msg,setMsg]=useState("");
  const load=()=>fetch("/api/student-tools").then(r=>r.ok?r.json():null).then(d=>{if(d){setPosts(d.posts||[]);setIssues(d.issues||[]);}}).catch(()=>{});
  useEffect(()=>{load();},[]);
  async function post(){if(!message.trim())return; const r=await fetch("/api/student-tools",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({type:"discussion",message})}); if(r.ok){setMessage("");load();} else setMsg("Could not post message.");}
  async function report(){if(!issue.trim())return; const r=await fetch("/api/student-tools",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({type:"issue",category,message:issue})}); if(r.ok){setIssue("");setMsg("Issue reported successfully.");load();} else setMsg("Could not submit issue.");}
  return <div className="feature-grid"><div className="card"><div className="section-head"><div><h3>💬 Class Discussion</h3><div className="hint">Ask questions and share useful class information.</div></div></div><div className="inline-form"><input value={message} onChange={e=>setMessage(e.target.value)} placeholder="Ask your class something..." /><button className="btn btn-primary btn-sm" onClick={post}>Post</button></div><div className="discussion-list">{posts.slice(0,6).map(p=><div className="discussion-item" key={p.id}><strong>{p.student.fullName}</strong><span className="hint"> · {new Date(p.createdAt).toLocaleString()}</span><div>{p.message}</div></div>)}{posts.length===0&&<div className="empty-state">No discussion posts yet.</div>}</div></div><div className="card"><h3>🆘 Report an Issue</h3><div className="hint">Report attendance, timetable, assignment or portal problems to the CR.</div><select value={category} onChange={e=>setCategory(e.target.value)} style={{marginTop:10}}><option>Attendance</option><option>Timetable</option><option>Assignment</option><option>Technical</option><option>Other</option></select><textarea value={issue} onChange={e=>setIssue(e.target.value)} placeholder="Describe the issue..." rows={4} style={{width:"100%",marginTop:8}} /><button className="btn btn-secondary btn-sm" onClick={report}>Submit Report</button>{msg&&<div className="success-text">{msg}</div>}<div className="issue-list">{issues.slice(0,4).map(i=><div className="tracker-row" key={i.id}><div><strong>{i.category}</strong><div className="hint">{new Date(i.createdAt).toLocaleDateString()} · {i.message}</div></div><span className="chip chip-flat">{i.status}</span></div>)}</div></div></div>;
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
  const [timetable, setTimetable] = useState<TimetableEntry[]>([]);
  const [portalSettings, setPortalSettings] = useState<PortalSettings>({});

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
        setPortalSettings(settings.settings || {});
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

  useEffect(() => { fetch("/api/timetable").then(r=>r.ok?r.json():null).then(d=>setTimetable(d?.entries||[])).catch(()=>{}); }, []);

  const heatmap = useMemo(() => buildHeatmap(data?.records || []), [data]);
  const notifications = useMemo<NotificationItem[]>(() => [
    ...hub.announcements.slice(0,4).map((x:any)=>({id:`a-${x.id}`,icon:"📢",title:x.title,meta:`Announcement · ${new Date(x.createdAt).toLocaleDateString()}`,kind:"announcement"})),
    ...hub.assignments.slice(0,4).map((x:any)=>({id:`as-${x.id}`,icon:"📝",title:x.title,meta:`Assignment · Due ${new Date(x.dueDate).toLocaleDateString()}`,kind:"assignment"})),
    ...hub.exams.slice(0,3).map((x:any)=>({id:`e-${x.id}`,icon:"📅",title:x.title,meta:`${x.subject} · ${new Date(x.date).toLocaleDateString()}`,kind:"exam"}))
  ], [hub]);

  return (
    <div>
      <div className="topbar">
        <div className="topbar-inner">
          <div className="brand-cluster">
            <PortalLogo size={52} fallback={<BrandMark />} />
            <div>
              <h1>{portalSettings.className || "5th-5M"} <span className="topbar-accent">Student Portal</span></h1>
              <div className="sub">{portalSettings.program || "BS Information Technology"} · {portalSettings.university || "IUB"}</div>
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

        {me?.user?.student && data && (
          <div className="card dashboard-hero">
            <div><div className="hint">PERSONALIZED DASHBOARD</div><h2 style={{margin:"4px 0"}}>Good day, {me.user.student.fullName.split(" ")[0]} 👋</h2><div className="sub">{me.user.student.program} · {me.user.student.section} · {me.user.student.semester}</div></div>
            <NotificationCenter items={notifications} />
          </div>
        )}

        
        <div className="stat-grid">
          <div className="stat-card"><div className="label">ATTENDANCE</div><div className="value">{data ? `${data.overallPercentage}%` : "—"}</div></div>
          <div className="stat-card"><div className="label">PENDING WORK</div><div className="value">{hub.assignments.filter((x:any)=>new Date(x.dueDate).getTime()>=Date.now()).length}</div></div>
          <div className="stat-card"><div className="label">UPCOMING EXAMS</div><div className="value">{hub.exams.filter((x:any)=>new Date(x.date).getTime()>=Date.now()-86400000).length}</div></div>
          <div className={`stat-card ${data && data.overallPercentage < threshold ? "warn" : ""}`}><div className="label">STATUS</div><div className="value">{data && data.overallPercentage < threshold ? "⚠️" : "✓"}</div></div>
        </div>

        <div className="feature-grid">
          <AssignmentTracker assignments={hub.assignments} />
          <ExamCountdown exams={hub.exams} />
        </div>

        {data && <AttendanceCalculator data={data} threshold={threshold} />}

        <div className="card">
          <div className="section-head"><div><h3>📚 Subject Dashboard</h3><div className="hint">Subjects, teachers and attendance in one place.</div></div></div>
          <div className="subject-cards">{subjects.map(s=>{const a=data?.bySubject.find(x=>x.subjectId===s.id); return <div className="subject-card" key={s.id}><div><strong>{s.name}</strong><div className="hint">{s.code||"No code"} · {s.teacher?.fullName||"Teacher not assigned"}</div></div><span className={`badge ${a && a.percentage < threshold ? "badge-absent":"badge-present"}`}>{a?.percentage ?? 0}%</span></div>})}</div>
        </div>

        <DiscussionAndIssues />

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