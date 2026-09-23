"use client";

import { useEffect, useState } from "react";

type Post = { id: string; message: string; createdAt: string; student: { fullName: string; iubId: string } };
type Issue = { id: string; category: string; message: string; status: string; createdAt: string; student: { fullName: string; iubId: string } };

export default function FeedbackPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true); const r = await fetch("/api/student-tools"); const d = await r.json(); setPosts(d.posts || []); setIssues(d.issues || []); setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function status(id: string, value: string) {
    await fetch("/api/student-tools", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "issue", id, status: value }) }); load();
  }
  async function remove(type: string, id: string) {
    if (!confirm("Remove this item?")) return; await fetch(`/api/student-tools?type=${type}&id=${id}`, { method: "DELETE" }); load();
  }

  return <div>
    <div className="page-heading"><div><div className="eyebrow">STUDENT VOICE</div><h2>Student Feedback</h2><p>Review discussion posts and manage reported issues from one clean control panel.</p></div><button className="btn btn-secondary" onClick={load}>Refresh</button></div>
    {loading ? <div className="card">Loading feedback...</div> : <div className="feedback-grid">
      <div className="card"><div className="section-head"><div><h3>💬 Class Discussion</h3><div className="hint">Recent student posts</div></div><span className="chip chip-flat">{posts.length}</span></div>{posts.length === 0 ? <div className="empty-state">No discussion posts.</div> : posts.map(p => <div className="feedback-item" key={p.id}><div><strong>{p.student.fullName}</strong><div className="hint">{p.student.iubId} · {new Date(p.createdAt).toLocaleString()}</div><p>{p.message}</p></div><button className="btn btn-danger btn-sm" onClick={() => remove("discussion", p.id)}>Remove</button></div>)}</div>
      <div className="card"><div className="section-head"><div><h3>🆘 Reported Issues</h3><div className="hint">Attendance, timetable and portal reports</div></div><span className="chip chip-flat">{issues.length}</span></div>{issues.length === 0 ? <div className="empty-state">No issues reported.</div> : issues.map(i => <div className="feedback-item" key={i.id}><div style={{ minWidth: 0 }}><div className="pill-row"><strong>{i.category}</strong><span className={`chip ${i.status === "RESOLVED" ? "chip-up" : i.status === "IN_PROGRESS" ? "chip-flat" : "chip-down"}`}>{i.status}</span></div><div className="hint">{i.student.fullName} · {i.student.iubId} · {new Date(i.createdAt).toLocaleString()}</div><p>{i.message}</p><div className="feedback-actions"><button className="btn btn-secondary btn-sm" onClick={() => status(i.id, "OPEN")}>Open</button><button className="btn btn-secondary btn-sm" onClick={() => status(i.id, "IN_PROGRESS")}>In Progress</button><button className="btn btn-primary btn-sm" onClick={() => status(i.id, "RESOLVED")}>Resolve</button><button className="btn btn-danger btn-sm" onClick={() => remove("issue", i.id)}>Delete</button></div></div></div>)}</div>
    </div>}
  </div>;
}
