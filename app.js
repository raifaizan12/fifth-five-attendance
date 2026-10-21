"use strict";
const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const path = require("path");
const crypto = require("crypto");
const { q, one, exec } = require("./db");

const CLASS_CODE = (process.env.CLASS_CODE || "").trim();
const JWT_SECRET = process.env.JWT_SECRET || crypto.createHash("sha256").update("portal-jwt:" + (process.env.DATABASE_URL || "dev")).digest("hex");

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users(
  id SERIAL PRIMARY KEY,
  username TEXT NOT NULL,
  name TEXT NOT NULL,
  roll TEXT NOT NULL DEFAULT '',
  role TEXT NOT NULL CHECK(role IN ('cr','student')),
  pass_hash TEXT NOT NULL,
  created_at DOUBLE PRECISION NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS users_username_lower ON users(lower(username));
CREATE TABLE IF NOT EXISTS announcements(
  id SERIAL PRIMARY KEY, title TEXT NOT NULL, body TEXT NOT NULL DEFAULT '', created_at DOUBLE PRECISION NOT NULL
);
CREATE TABLE IF NOT EXISTS assignments(
  id SERIAL PRIMARY KEY, title TEXT NOT NULL, subject TEXT NOT NULL DEFAULT '', due TEXT NOT NULL DEFAULT '', created_at DOUBLE PRECISION NOT NULL
);
CREATE TABLE IF NOT EXISTS completions(
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  assignment_id INT NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
  PRIMARY KEY(user_id, assignment_id)
);
CREATE TABLE IF NOT EXISTS subjects(id SERIAL PRIMARY KEY, name TEXT NOT NULL, created_at DOUBLE PRECISION NOT NULL);
CREATE UNIQUE INDEX IF NOT EXISTS subjects_name_lower ON subjects(lower(name));
CREATE TABLE IF NOT EXISTS attendance(
  date TEXT NOT NULL,
  subject_id INT REFERENCES subjects(id) ON DELETE CASCADE,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK(status IN ('P','A','L'))
);
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS subject_id INT REFERENCES subjects(id) ON DELETE CASCADE;
CREATE TABLE IF NOT EXISTS timetable(
  id SERIAL PRIMARY KEY, day INT NOT NULL CHECK(day BETWEEN 1 AND 7), t_start TEXT NOT NULL, t_end TEXT NOT NULL,
  subject_id INT REFERENCES subjects(id) ON DELETE SET NULL,
  title TEXT NOT NULL DEFAULT '', room TEXT NOT NULL DEFAULT '', teacher TEXT NOT NULL DEFAULT ''
);
CREATE TABLE IF NOT EXISTS resources(
  id SERIAL PRIMARY KEY, title TEXT NOT NULL, url TEXT NOT NULL,
  subject_id INT REFERENCES subjects(id) ON DELETE SET NULL, created_at DOUBLE PRECISION NOT NULL
);
CREATE TABLE IF NOT EXISTS exams(
  id SERIAL PRIMARY KEY, title TEXT NOT NULL, subject_id INT REFERENCES subjects(id) ON DELETE SET NULL,
  date TEXT NOT NULL, max_marks DOUBLE PRECISION NOT NULL DEFAULT 100, created_at DOUBLE PRECISION NOT NULL
);
CREATE TABLE IF NOT EXISTS marks(
  exam_id INT NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  score DOUBLE PRECISION NOT NULL, PRIMARY KEY(exam_id, user_id)
);
CREATE TABLE IF NOT EXISTS leaves(
  id SERIAL PRIMARY KEY, user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  from_date TEXT NOT NULL, to_date TEXT NOT NULL, reason TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','rejected')),
  note TEXT NOT NULL DEFAULT '', created_at DOUBLE PRECISION NOT NULL
);
CREATE TABLE IF NOT EXISTS settings(key TEXT PRIMARY KEY, value TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS throttle(key TEXT PRIMARY KEY, n INT NOT NULL, t DOUBLE PRECISION NOT NULL);
`;
const SCHEMA2 = `
ALTER TABLE attendance DROP CONSTRAINT IF EXISTS attendance_pkey;
ALTER TABLE attendance ALTER COLUMN subject_id SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS attendance_uniq ON attendance(date, subject_id, user_id);
CREATE INDEX IF NOT EXISTS attendance_subject ON attendance(subject_id, date);
`;
const FEATURES = ["timetable", "resources", "exams", "leaves"];
const DEFAULT_MSG = "The portal is being updated. Please check back soon.";

let ready = null, configError = "";
function init() {
  if (!ready) ready = (async () => {
    await exec(SCHEMA);
    // migrate older single-subject attendance into a "General" subject
    if (await one("SELECT 1 AS x FROM attendance WHERE subject_id IS NULL LIMIT 1")) {
      await q("INSERT INTO subjects(name,created_at) VALUES('General',$1) ON CONFLICT DO NOTHING", [Date.now()]);
      await q("UPDATE attendance SET subject_id=(SELECT id FROM subjects WHERE lower(name)='general') WHERE subject_id IS NULL");
    }
    if (!(await one("SELECT to_regclass('public.attendance_uniq') AS r")).r) await exec(SCHEMA2);
    const hasCR = await one("SELECT 1 AS x FROM users WHERE role='cr' LIMIT 1");
    if (!hasCR) {
      const pw = process.env.ADMIN_PASSWORD;
      if (!pw) { configError = "Server is not configured: set ADMIN_PASSWORD in the environment variables and redeploy."; return; }
      await q("INSERT INTO users(username,name,roll,role,pass_hash,created_at) VALUES($1,$2,'','cr',$3,$4) ON CONFLICT DO NOTHING",
        [process.env.ADMIN_USERNAME || "cr", "Class Representative", bcrypt.hashSync(pw, 10), Date.now()]);
    }
    configError = "";
  })().catch((e) => { ready = null; throw e; });
  return ready;
}
async function settings() {
  const rows = await q("SELECT key,value FROM settings");
  const m = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  return { maint: m.maint === "1", message: m.message || DEFAULT_MSG, features: Object.fromEntries(FEATURES.map((f) => [f, m["feat_" + f] !== "0"])) };
}
const putSet = (k, v) => q("INSERT INTO settings(key,value) VALUES($1,$2) ON CONFLICT(key) DO UPDATE SET value=excluded.value", [k, String(v)]);

const app = express();
app.set("trust proxy", 1);
app.disable("x-powered-by");
app.use(express.json({ limit: "100kb" }));
app.use((req, res, next) => {
  res.set({
    "X-Content-Type-Options": "nosniff", "X-Frame-Options": "DENY", "Referrer-Policy": "same-origin",
    "Content-Security-Policy": "default-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'; img-src 'self' data:"
  });
  next();
});
const A = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
const parseCookies = (h) => Object.fromEntries((h || "").split(";").map((s) => s.trim().split("=")).filter((a) => a[0]).map(([k, ...v]) => [k, decodeURIComponent(v.join("="))]));
const clean = (s, max) => String(s == null ? "" : s).trim().slice(0, max);
const userOut = (u) => ({ id: u.id, username: u.username, name: u.name, roll: u.roll, role: u.role });
const today = () => new Date().toISOString().slice(0, 10);
const validDate = (d) => /^\d{4}-\d{2}-\d{2}$/.test(d) && !isNaN(Date.parse(d));
const byRoll = (a, b) => String(a.roll).localeCompare(String(b.roll), undefined, { numeric: true }) || a.name.localeCompare(b.name);
const intId = (v) => { const n = parseInt(v, 10); return Number.isInteger(n) && n > 0 && n < 2147483647 ? n : null; };
function setCookie(req, res, id) {
  res.cookie("token", jwt.sign({ id }, JWT_SECRET, { expiresIn: "7d" }), { httpOnly: true, sameSite: "lax", secure: req.secure, maxAge: 7 * 864e5, path: "/" });
}

app.use("/api", A(async (req, res, next) => { await init(); next(); }));
// CSRF defence: state-changing calls must carry a custom header
app.use("/api", (req, res, next) => {
  if (req.method !== "GET" && req.get("X-Requested-With") !== "portal") return res.status(403).json({ error: "Forbidden" });
  next();
});
app.use("/api", A(async (req, res, next) => {
  const t = parseCookies(req.headers.cookie).token;
  if (t) {
    try { const { id } = jwt.verify(t, JWT_SECRET); const u = await one("SELECT * FROM users WHERE id=$1", [id]); if (u) req.user = u; } catch (e) { /* bad token */ }
  }
  next();
}));
const need = (req, res, next) => req.user ? next() : res.status(401).json({ error: "Please log in" });
const needCR = (req, res, next) => !req.user ? res.status(401).json({ error: "Please log in" }) : req.user.role !== "cr" ? res.status(403).json({ error: "Only the CR can do this" }) : next();

const OPEN = new Set(["/me", "/logout", "/settings", "/login", "/register"]);
app.use("/api", A(async (req, res, next) => {
  if (req.user && req.user.role !== "cr" && !OPEN.has(req.path)) {
    const s = await settings();
    if (s.maint) return res.status(503).json({ error: "maintenance", message: s.message });
  }
  next();
}));

const FEATURE_PATHS = { timetable: "timetable", resources: "resources", exams: "exams", leaves: "leaves" };
app.use("/api", A(async (req, res, next) => {
  if (req.user && req.user.role !== "cr") {
    const f = FEATURE_PATHS[req.path.split("/")[1]];
    if (f && !(await settings()).features[f]) return res.status(403).json({ error: "This section is turned off by your CR" });
  }
  next();
}));

async function throttled(key) {
  const now = Date.now();
  const r = await one(`INSERT INTO throttle(key,n,t) VALUES($1,1,$2) ON CONFLICT(key) DO UPDATE SET
    n=CASE WHEN $2 - throttle.t > 900000 THEN 1 ELSE throttle.n+1 END,
    t=CASE WHEN $2 - throttle.t > 900000 THEN $2 ELSE throttle.t END RETURNING n`, [key, now]);
  return r.n > 10;
}

// ---------- auth ----------
app.post("/api/login", A(async (req, res) => {
  if (configError) return res.status(500).json({ error: configError });
  const username = clean(req.body.username, 40), password = String(req.body.password || "");
  const key = req.ip + "|" + username.toLowerCase();
  if (await throttled(key)) return res.status(429).json({ error: "Too many attempts. Try again in 15 minutes." });
  const u = await one("SELECT * FROM users WHERE lower(username)=lower($1)", [username]);
  if (!u || !bcrypt.compareSync(password, u.pass_hash)) return res.status(401).json({ error: "Wrong username or password" });
  const s = await settings();
  if (s.maint && u.role !== "cr") return res.status(503).json({ error: "maintenance", message: s.message });
  await q("DELETE FROM throttle WHERE key=$1", [key]);
  setCookie(req, res, u.id);
  res.json({ user: userOut(u), settings: s });
}));
app.post("/api/register", A(async (req, res) => {
  if (CLASS_CODE && clean(req.body.code, 80) !== CLASS_CODE) return res.status(403).json({ error: "Wrong class code" });
  const username = clean(req.body.username, 30), name = clean(req.body.name, 80), roll = clean(req.body.roll, 20), password = String(req.body.password || "");
  if (!/^[a-z0-9._-]{3,30}$/i.test(username)) return res.status(400).json({ error: "Username: 3-30 letters, numbers, . _ -" });
  if (!name) return res.status(400).json({ error: "Enter your name" });
  if (password.length < 6) return res.status(400).json({ error: "Password must be at least 6 characters" });
  const u = await one("INSERT INTO users(username,name,roll,role,pass_hash,created_at) VALUES($1,$2,$3,'student',$4,$5) ON CONFLICT DO NOTHING RETURNING *",
    [username, name, roll, bcrypt.hashSync(password, 10), Date.now()]);
  if (!u) return res.status(409).json({ error: "That username is taken" });
  setCookie(req, res, u.id);
  res.json({ user: userOut(u), settings: await settings() });
}));
app.post("/api/logout", (req, res) => { res.clearCookie("token", { path: "/" }); res.json({ ok: true }); });
app.get("/api/me", A(async (req, res) => res.json({ user: req.user ? userOut(req.user) : null, settings: await settings() })));
app.get("/api/settings", A(async (req, res) => res.json(await settings())));
app.put("/api/settings", needCR, A(async (req, res) => {
  if (req.body.maint !== undefined) await putSet("maint", req.body.maint ? "1" : "0");
  if (req.body.message !== undefined) await putSet("message", clean(req.body.message, 300) || DEFAULT_MSG);
  if (req.body.features && typeof req.body.features === "object") for (const f of FEATURES) if (typeof req.body.features[f] === "boolean") await putSet("feat_" + f, req.body.features[f] ? "1" : "0");
  res.json(await settings());
}));
app.post("/api/me/password", need, A(async (req, res) => {
  const cur = String(req.body.current || ""), nw = String(req.body.password || "");
  if (!bcrypt.compareSync(cur, req.user.pass_hash)) return res.status(400).json({ error: "Current password is wrong" });
  if (nw.length < 6) return res.status(400).json({ error: "New password must be at least 6 characters" });
  await q("UPDATE users SET pass_hash=$1 WHERE id=$2", [bcrypt.hashSync(nw, 10), req.user.id]);
  res.json({ ok: true });
}));

// ---------- summary ----------
app.get("/api/summary", need, A(async (req, res) => {
  const c = await one("SELECT (SELECT COUNT(*) FROM users WHERE role='student')::int AS students, (SELECT COUNT(*) FROM assignments)::int AS assignments, (SELECT COUNT(*) FROM announcements)::int AS announcements");
  if (req.user.role === "cr") return res.json({ ...c, pending_leaves: (await one("SELECT COUNT(*)::int AS n FROM leaves WHERE status='pending'")).n });
  const d = await one("SELECT COUNT(*)::int AS c FROM completions WHERE user_id=$1", [req.user.id]);
  const a = await one("SELECT COALESCE(SUM(CASE WHEN status<>'A' THEN 1 ELSE 0 END),0)::int AS p, COUNT(*)::int AS t FROM attendance WHERE user_id=$1", [req.user.id]);
  res.json({ students: c.students, pending: Math.max(c.assignments - d.c, 0), pct: a.t ? Math.round(a.p / a.t * 100) : null });
}));

// ---------- announcements ----------
app.get("/api/announcements", need, A(async (req, res) => res.json(await q("SELECT id,title,body,created_at FROM announcements ORDER BY created_at DESC LIMIT 100"))));
app.post("/api/announcements", needCR, A(async (req, res) => {
  const title = clean(req.body.title, 120);
  if (!title) return res.status(400).json({ error: "Add a title" });
  const r = await one("INSERT INTO announcements(title,body,created_at) VALUES($1,$2,$3) RETURNING id", [title, clean(req.body.body, 2000), Date.now()]);
  res.json({ id: r.id });
}));
app.delete("/api/announcements/:id", needCR, A(async (req, res) => { const id = intId(req.params.id); if (id) await q("DELETE FROM announcements WHERE id=$1", [id]); res.json({ ok: true }); }));

// ---------- assignments ----------
app.get("/api/assignments", need, A(async (req, res) => {
  const rows = await q(`SELECT a.id,a.title,a.subject,a.due,
    (SELECT COUNT(*) FROM completions c WHERE c.assignment_id=a.id)::int AS done_count,
    EXISTS(SELECT 1 FROM completions c WHERE c.assignment_id=a.id AND c.user_id=$1) AS done
    FROM assignments a ORDER BY CASE WHEN a.due='' THEN 1 ELSE 0 END, a.due, a.id`, [req.user.id]);
  const t = await one("SELECT COUNT(*)::int AS c FROM users WHERE role='student'");
  res.json({ total_students: t.c, items: rows });
}));
app.post("/api/assignments", needCR, A(async (req, res) => {
  const title = clean(req.body.title, 120), due = clean(req.body.due, 10);
  if (!title) return res.status(400).json({ error: "Add a title" });
  if (due && !validDate(due)) return res.status(400).json({ error: "Invalid due date" });
  const r = await one("INSERT INTO assignments(title,subject,due,created_at) VALUES($1,$2,$3,$4) RETURNING id", [title, clean(req.body.subject, 60), due, Date.now()]);
  res.json({ id: r.id });
}));
app.delete("/api/assignments/:id", needCR, A(async (req, res) => { const id = intId(req.params.id); if (id) await q("DELETE FROM assignments WHERE id=$1", [id]); res.json({ ok: true }); }));
app.post("/api/assignments/:id/done", need, A(async (req, res) => {
  const id = intId(req.params.id);
  if (!id || !(await one("SELECT 1 AS x FROM assignments WHERE id=$1", [id]))) return res.status(404).json({ error: "Not found" });
  if (req.body.done) await q("INSERT INTO completions(user_id,assignment_id) VALUES($1,$2) ON CONFLICT DO NOTHING", [req.user.id, id]);
  else await q("DELETE FROM completions WHERE user_id=$1 AND assignment_id=$2", [req.user.id, id]);
  res.json({ ok: true });
}));

// ---------- students (CR) ----------
app.get("/api/students", needCR, A(async (req, res) => {
  const total = (await one("SELECT COUNT(*)::int AS c FROM assignments")).c;
  const rows = await q(`SELECT u.id,u.username,u.name,u.roll,
    (SELECT COUNT(*) FROM attendance a WHERE a.user_id=u.id AND a.status='P')::int AS present,
    (SELECT COUNT(*) FROM attendance a WHERE a.user_id=u.id AND a.status='L')::int AS late,
    (SELECT COUNT(*) FROM attendance a WHERE a.user_id=u.id AND a.status='A')::int AS absent,
    (SELECT COUNT(*) FROM completions c WHERE c.user_id=u.id)::int AS done
    FROM users u WHERE u.role='student'`);
  rows.sort(byRoll);
  res.json({ total_assignments: total, items: rows.map((r) => { const t = r.present + r.late + r.absent; return { ...r, pct: t ? Math.round((r.present + r.late) / t * 100) : null }; }) });
}));
app.post("/api/students", needCR, A(async (req, res) => {
  const username = clean(req.body.username, 30), name = clean(req.body.name, 80), roll = clean(req.body.roll, 20), password = String(req.body.password || "");
  const role = req.body.role === "cr" ? "cr" : "student";
  if (!/^[a-z0-9._-]{3,30}$/i.test(username)) return res.status(400).json({ error: "Username: 3-30 letters, numbers, . _ -" });
  if (!name) return res.status(400).json({ error: "Enter a name" });
  if (password.length < 6) return res.status(400).json({ error: "Password must be at least 6 characters" });
  const r = await one("INSERT INTO users(username,name,roll,role,pass_hash,created_at) VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT DO NOTHING RETURNING id", [username, name, roll, role, bcrypt.hashSync(password, 10), Date.now()]);
  if (!r) return res.status(409).json({ error: "That username is taken" });
  res.json({ id: r.id });
}));
app.post("/api/students/:id/password", needCR, A(async (req, res) => {
  const pw = String(req.body.password || ""), id = intId(req.params.id);
  if (pw.length < 6) return res.status(400).json({ error: "Password must be at least 6 characters" });
  const r = id && await one("UPDATE users SET pass_hash=$1 WHERE id=$2 AND role='student' RETURNING id", [bcrypt.hashSync(pw, 10), id]);
  res.status(r ? 200 : 404).json(r ? { ok: true } : { error: "Student not found" });
}));
app.delete("/api/students/:id", needCR, A(async (req, res) => {
  const id = intId(req.params.id);
  const r = id && await one("DELETE FROM users WHERE id=$1 AND role='student' RETURNING id", [id]);
  res.status(r ? 200 : 404).json(r ? { ok: true } : { error: "Student not found" });
}));

// ---------- subjects ----------
const listSubjects = () => q("SELECT id,name FROM subjects ORDER BY lower(name)");
app.get("/api/subjects", need, A(async (req, res) => res.json(await listSubjects())));
app.post("/api/subjects", needCR, A(async (req, res) => {
  const name = clean(req.body.name, 60);
  if (!name) return res.status(400).json({ error: "Enter a subject name" });
  const r = await one("INSERT INTO subjects(name,created_at) VALUES($1,$2) ON CONFLICT DO NOTHING RETURNING id", [name, Date.now()]);
  if (!r) return res.status(409).json({ error: "That subject already exists" });
  res.json({ id: r.id });
}));
app.delete("/api/subjects/:id", needCR, A(async (req, res) => { const id = intId(req.params.id); if (id) await q("DELETE FROM subjects WHERE id=$1", [id]); res.json({ ok: true }); }));

// ---------- attendance (per subject) ----------
app.get("/api/attendance", needCR, A(async (req, res) => {
  const date = validDate(req.query.date) ? req.query.date : today();
  const subjects = await listSubjects();
  let sid = intId(req.query.subject_id);
  if (!sid || !subjects.some((s) => s.id === sid)) sid = subjects.length ? subjects[0].id : null;
  const marks = {};
  if (sid) (await q("SELECT user_id,status FROM attendance WHERE date=$1 AND subject_id=$2", [date, sid])).forEach((r) => { marks[r.user_id] = r.status; });
  const students = await q("SELECT id,name,roll FROM users WHERE role='student'");
  res.json({ date, subjects, subject_id: sid, students: students.sort(byRoll), marks });
}));
app.put("/api/attendance", needCR, A(async (req, res) => {
  const date = clean(req.body.date, 10), marks = req.body.marks, sid = intId(req.body.subject_id);
  if (!validDate(date)) return res.status(400).json({ error: "Invalid date" });
  if (date > today()) return res.status(400).json({ error: "Cannot mark a future date" });
  if (!sid || !(await one("SELECT 1 AS x FROM subjects WHERE id=$1", [sid]))) return res.status(400).json({ error: "Choose a subject first" });
  if (!marks || typeof marks !== "object") return res.status(400).json({ error: "Invalid marks" });
  const ups = [], dels = [];
  for (const [k, st] of Object.entries(marks)) {
    const id = intId(k); if (!id) continue;
    if (st === "P" || st === "A" || st === "L") ups.push([id, st]); else if (st === "" || st === null) dels.push(id);
  }
  if (ups.length) await q(`INSERT INTO attendance(date,subject_id,user_id,status)
    SELECT $1, $2, x.uid, x.st FROM unnest($3::int[], $4::text[]) AS x(uid,st) JOIN users u ON u.id=x.uid AND u.role='student'
    ON CONFLICT(date,subject_id,user_id) DO UPDATE SET status=excluded.status`, [date, sid, ups.map((u) => u[0]), ups.map((u) => u[1])]);
  if (dels.length) await q("DELETE FROM attendance WHERE date=$1 AND subject_id=$2 AND user_id = ANY($3::int[])", [date, sid, dels]);
  res.json({ ok: true });
}));
const pctOf = (p, l, a) => { const t = p + l + a; return t ? Math.round((p + l) / t * 100) : null; };
app.get("/api/attendance/me", need, A(async (req, res) => {
  const records = await q("SELECT a.date,a.status,a.subject_id,s.name AS subject FROM attendance a JOIN subjects s ON s.id=a.subject_id WHERE a.user_id=$1 ORDER BY a.date DESC, lower(s.name) LIMIT 400", [req.user.id]);
  const rows = await q(`SELECT s.id,s.name,
    COUNT(*) FILTER (WHERE a.status='P')::int AS present, COUNT(*) FILTER (WHERE a.status='L')::int AS late, COUNT(*) FILTER (WHERE a.status='A')::int AS absent
    FROM attendance a JOIN subjects s ON s.id=a.subject_id WHERE a.user_id=$1 GROUP BY s.id,s.name ORDER BY lower(s.name)`, [req.user.id]);
  const by = rows.map((r) => ({ ...r, pct: pctOf(r.present, r.late, r.absent) }));
  const tot = by.reduce((x, r) => ({ p: x.p + r.present, l: x.l + r.late, a: x.a + r.absent }), { p: 0, l: 0, a: 0 });
  res.json({ records, by_subject: by, pct: pctOf(tot.p, tot.l, tot.a) });
}));

// ---------- reports (CR) ----------
app.get("/api/reports", needCR, A(async (req, res) => {
  const to = validDate(req.query.to) ? req.query.to : today();
  const from = validDate(req.query.from) ? req.query.from : to.slice(0, 8) + "01";
  if (from > to) return res.status(400).json({ error: "The start date must be before the end date" });
  const sid = intId(req.query.subject_id);
  const subjects = (await listSubjects()).filter((s) => !sid || s.id === sid);
  const params = [from, to]; let w = "date>=$1 AND date<=$2";
  if (sid) { params.push(sid); w += " AND subject_id=$3"; }
  const agg = await q(`SELECT user_id,subject_id,
    COUNT(*) FILTER (WHERE status='P')::int AS p, COUNT(*) FILTER (WHERE status='L')::int AS l, COUNT(*) FILTER (WHERE status='A')::int AS a
    FROM attendance WHERE ${w} GROUP BY user_id,subject_id`, params);
  const held = await q(`SELECT subject_id, COUNT(DISTINCT date)::int AS c FROM attendance WHERE ${w} GROUP BY subject_id`, params);
  const students = (await q("SELECT id,name,roll FROM users WHERE role='student'")).sort(byRoll);
  const byStu = {}, bySub = {};
  agg.forEach((r) => {
    (byStu[r.user_id] = byStu[r.user_id] || {})[r.subject_id] = r;
    const x = bySub[r.subject_id] = bySub[r.subject_id] || { p: 0, l: 0, a: 0 }; x.p += r.p; x.l += r.l; x.a += r.a;
  });
  const heldMap = Object.fromEntries(held.map((h) => [h.subject_id, h.c]));
  res.json({
    from, to, subject_id: sid,
    subjects: subjects.map((s) => { const x = bySub[s.id] || { p: 0, l: 0, a: 0 }; return { id: s.id, name: s.name, classes: heldMap[s.id] || 0, avg_pct: pctOf(x.p, x.l, x.a) }; }),
    students: students.map((st) => {
      const by = {}, tot = { p: 0, l: 0, a: 0 };
      subjects.forEach((sub) => { const r = (byStu[st.id] || {})[sub.id]; if (r) { by[sub.id] = { p: r.p, l: r.l, a: r.a, pct: pctOf(r.p, r.l, r.a) }; tot.p += r.p; tot.l += r.l; tot.a += r.a; } });
      return { id: st.id, name: st.name, roll: st.roll, by, total: { ...tot, pct: pctOf(tot.p, tot.l, tot.a) } };
    })
  });
}));

// ---------- attendance sessions (edit / delete past records, CR) ----------
app.get("/api/attendance/sessions", needCR, A(async (req, res) => {
  res.json(await q(`SELECT a.date,a.subject_id,s.name AS subject,
    COUNT(*) FILTER (WHERE a.status='P')::int AS present, COUNT(*) FILTER (WHERE a.status='L')::int AS late, COUNT(*) FILTER (WHERE a.status='A')::int AS absent
    FROM attendance a JOIN subjects s ON s.id=a.subject_id GROUP BY a.date,a.subject_id,s.name ORDER BY a.date DESC, lower(s.name) LIMIT 60`));
}));
app.delete("/api/attendance", needCR, A(async (req, res) => {
  const sid = intId(req.query.subject_id);
  if (!validDate(req.query.date) || !sid) return res.status(400).json({ error: "Invalid session" });
  await q("DELETE FROM attendance WHERE date=$1 AND subject_id=$2", [req.query.date, sid]);
  res.json({ ok: true });
}));

// ---------- timetable ----------
const validTime = (t) => /^([01]\d|2[0-3]):[0-5]\d$/.test(t);
const optSubject = async (v) => { const id = intId(v); return id && (await one("SELECT 1 AS x FROM subjects WHERE id=$1", [id])) ? id : null; };
app.get("/api/timetable", need, A(async (req, res) => res.json(await q(`SELECT t.id,t.day,t.t_start AS start,t.t_end AS finish,t.subject_id,
  COALESCE(NULLIF(t.title,''),s.name,'Class') AS title,t.room,t.teacher FROM timetable t LEFT JOIN subjects s ON s.id=t.subject_id ORDER BY t.day,t.t_start`))));
app.post("/api/timetable", needCR, A(async (req, res) => {
  const day = parseInt(req.body.day, 10), start = clean(req.body.start, 5), end = clean(req.body.finish, 5), title = clean(req.body.title, 60);
  const sid = await optSubject(req.body.subject_id);
  if (!(day >= 1 && day <= 7)) return res.status(400).json({ error: "Choose a day" });
  if (!validTime(start) || !validTime(end) || start >= end) return res.status(400).json({ error: "Enter a valid start and end time" });
  if (!sid && !title) return res.status(400).json({ error: "Choose a subject or type a title" });
  const r = await one("INSERT INTO timetable(day,t_start,t_end,subject_id,title,room,teacher) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING id", [day, start, end, sid, title, clean(req.body.room, 30), clean(req.body.teacher, 60)]);
  res.json({ id: r.id });
}));
app.delete("/api/timetable/:id", needCR, A(async (req, res) => { const id = intId(req.params.id); if (id) await q("DELETE FROM timetable WHERE id=$1", [id]); res.json({ ok: true }); }));

// ---------- resources ----------
app.get("/api/resources", need, A(async (req, res) => res.json(await q("SELECT r.id,r.title,r.url,r.created_at,s.name AS subject FROM resources r LEFT JOIN subjects s ON s.id=r.subject_id ORDER BY r.created_at DESC LIMIT 200"))));
app.post("/api/resources", needCR, A(async (req, res) => {
  const title = clean(req.body.title, 120), url = clean(req.body.url, 500);
  if (!title) return res.status(400).json({ error: "Add a title" });
  if (!/^https?:\/\/[^\s]+$/i.test(url)) return res.status(400).json({ error: "Enter a full link starting with http:// or https://" });
  const r = await one("INSERT INTO resources(title,url,subject_id,created_at) VALUES($1,$2,$3,$4) RETURNING id", [title, url, await optSubject(req.body.subject_id), Date.now()]);
  res.json({ id: r.id });
}));
app.delete("/api/resources/:id", needCR, A(async (req, res) => { const id = intId(req.params.id); if (id) await q("DELETE FROM resources WHERE id=$1", [id]); res.json({ ok: true }); }));

// ---------- exams and marks ----------
app.get("/api/exams", need, A(async (req, res) => {
  const cr = req.user.role === "cr";
  const rows = await q(`SELECT e.id,e.title,e.date,e.max_marks,e.subject_id,s.name AS subject,
    (SELECT score FROM marks m WHERE m.exam_id=e.id AND m.user_id=$1) AS score
    ${cr ? ",(SELECT COUNT(*)::int FROM marks m WHERE m.exam_id=e.id) AS graded,(SELECT AVG(score) FROM marks m WHERE m.exam_id=e.id) AS avg" : ""}
    FROM exams e LEFT JOIN subjects s ON s.id=e.subject_id ORDER BY e.date DESC, e.id DESC`, [req.user.id]);
  res.json(rows);
}));
app.post("/api/exams", needCR, A(async (req, res) => {
  const title = clean(req.body.title, 120), date = clean(req.body.date, 10), max = req.body.max_marks === "" || req.body.max_marks == null ? 100 : Number(req.body.max_marks);
  if (!title) return res.status(400).json({ error: "Add a title" });
  if (!validDate(date)) return res.status(400).json({ error: "Choose the exam date" });
  if (!(max > 0 && max <= 1000)) return res.status(400).json({ error: "Total marks must be between 1 and 1000" });
  const r = await one("INSERT INTO exams(title,subject_id,date,max_marks,created_at) VALUES($1,$2,$3,$4,$5) RETURNING id", [title, await optSubject(req.body.subject_id), date, max, Date.now()]);
  res.json({ id: r.id });
}));
app.delete("/api/exams/:id", needCR, A(async (req, res) => { const id = intId(req.params.id); if (id) await q("DELETE FROM exams WHERE id=$1", [id]); res.json({ ok: true }); }));
app.get("/api/exams/:id/marks", needCR, A(async (req, res) => {
  const id = intId(req.params.id);
  const exam = id && await one("SELECT e.id,e.title,e.date,e.max_marks,s.name AS subject FROM exams e LEFT JOIN subjects s ON s.id=e.subject_id WHERE e.id=$1", [id]);
  if (!exam) return res.status(404).json({ error: "Exam not found" });
  const students = await q("SELECT u.id,u.name,u.roll,m.score FROM users u LEFT JOIN marks m ON m.user_id=u.id AND m.exam_id=$1 WHERE u.role='student'", [id]);
  res.json({ exam, students: students.sort(byRoll) });
}));
app.put("/api/exams/:id/marks", needCR, A(async (req, res) => {
  const id = intId(req.params.id), scores = req.body.scores;
  const exam = id && await one("SELECT max_marks FROM exams WHERE id=$1", [id]);
  if (!exam) return res.status(404).json({ error: "Exam not found" });
  if (!scores || typeof scores !== "object") return res.status(400).json({ error: "Invalid marks" });
  const ups = [], dels = [];
  for (const [k, v] of Object.entries(scores)) {
    const uid = intId(k); if (!uid) continue;
    if (v === "" || v === null) { dels.push(uid); continue; }
    const n = Number(v);
    if (!Number.isFinite(n) || n < 0 || n > exam.max_marks) return res.status(400).json({ error: "Marks must be between 0 and " + exam.max_marks });
    ups.push([uid, n]);
  }
  if (ups.length) await q(`INSERT INTO marks(exam_id,user_id,score) SELECT $1, x.uid, x.sc FROM unnest($2::int[], $3::float8[]) AS x(uid,sc)
    JOIN users u ON u.id=x.uid AND u.role='student' ON CONFLICT(exam_id,user_id) DO UPDATE SET score=excluded.score`, [id, ups.map((u) => u[0]), ups.map((u) => u[1])]);
  if (dels.length) await q("DELETE FROM marks WHERE exam_id=$1 AND user_id = ANY($2::int[])", [id, dels]);
  res.json({ ok: true });
}));

// ---------- leave requests ----------
app.get("/api/leaves", need, A(async (req, res) => {
  const cr = req.user.role === "cr";
  res.json(await q(`SELECT l.id,l.from_date,l.to_date,l.reason,l.status,l.note,l.created_at,u.name,u.roll FROM leaves l JOIN users u ON u.id=l.user_id
    ${cr ? "" : "WHERE l.user_id=$1"} ORDER BY CASE WHEN l.status='pending' THEN 0 ELSE 1 END, l.created_at DESC LIMIT 200`, cr ? [] : [req.user.id]));
}));
app.post("/api/leaves", need, A(async (req, res) => {
  if (req.user.role === "cr") return res.status(403).json({ error: "Only students request leave" });
  const from = clean(req.body.from_date, 10), to = clean(req.body.to_date, 10), reason = clean(req.body.reason, 300);
  if (!validDate(from) || !validDate(to) || from > to) return res.status(400).json({ error: "Choose valid dates (start before end)" });
  if (!reason) return res.status(400).json({ error: "Write a reason" });
  if ((await one("SELECT COUNT(*)::int AS n FROM leaves WHERE user_id=$1 AND status='pending'", [req.user.id])).n >= 5) return res.status(400).json({ error: "You already have 5 pending requests" });
  const r = await one("INSERT INTO leaves(user_id,from_date,to_date,reason,created_at) VALUES($1,$2,$3,$4,$5) RETURNING id", [req.user.id, from, to, reason, Date.now()]);
  res.json({ id: r.id });
}));
app.put("/api/leaves/:id", needCR, A(async (req, res) => {
  const id = intId(req.params.id), st = req.body.status;
  if (!id || !["approved", "rejected", "pending"].includes(st)) return res.status(400).json({ error: "Invalid status" });
  const r = await one("UPDATE leaves SET status=$1, note=$2 WHERE id=$3 RETURNING id", [st, clean(req.body.note, 200), id]);
  res.status(r ? 200 : 404).json(r ? { ok: true } : { error: "Request not found" });
}));
app.delete("/api/leaves/:id", need, A(async (req, res) => {
  const id = intId(req.params.id); if (!id) return res.json({ ok: true });
  if (req.user.role === "cr") await q("DELETE FROM leaves WHERE id=$1", [id]);
  else await q("DELETE FROM leaves WHERE id=$1 AND user_id=$2 AND status='pending'", [id, req.user.id]);
  res.json({ ok: true });
}));

app.use("/api", (req, res) => res.status(404).json({ error: "Not found" }));
app.use(express.static(path.join(__dirname, "public"), { maxAge: "5m" }));
app.use((err, req, res, next) => {
  if (err.type === "entity.parse.failed") return res.status(400).json({ error: "Bad request" });
  console.error(err);
  res.status(500).json({ error: "Server error. Check the database connection (DATABASE_URL)." });
});
module.exports = app;
