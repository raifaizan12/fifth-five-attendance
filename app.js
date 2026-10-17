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
CREATE TABLE IF NOT EXISTS attendance(
  date TEXT NOT NULL,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK(status IN ('P','A','L')),
  PRIMARY KEY(date, user_id)
);
CREATE TABLE IF NOT EXISTS settings(key TEXT PRIMARY KEY, value TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS throttle(key TEXT PRIMARY KEY, n INT NOT NULL, t DOUBLE PRECISION NOT NULL);
`;
const DEFAULT_MSG = "The portal is being updated. Please check back soon.";

let ready = null, configError = "";
function init() {
  if (!ready) ready = (async () => {
    await exec(SCHEMA);
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
  const rows = await q("SELECT key,value FROM settings WHERE key IN ('maint','message')");
  const m = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  return { maint: m.maint === "1", message: m.message || DEFAULT_MSG };
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
  if (req.user.role === "cr") return res.json(c);
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

// ---------- attendance ----------
app.get("/api/attendance", needCR, A(async (req, res) => {
  const date = validDate(req.query.date) ? req.query.date : today();
  const marks = {};
  (await q("SELECT user_id,status FROM attendance WHERE date=$1", [date])).forEach((r) => { marks[r.user_id] = r.status; });
  const students = await q("SELECT id,name,roll FROM users WHERE role='student'");
  res.json({ date, students: students.sort(byRoll), marks });
}));
app.put("/api/attendance", needCR, A(async (req, res) => {
  const date = clean(req.body.date, 10), marks = req.body.marks;
  if (!validDate(date)) return res.status(400).json({ error: "Invalid date" });
  if (date > today()) return res.status(400).json({ error: "Cannot mark a future date" });
  if (!marks || typeof marks !== "object") return res.status(400).json({ error: "Invalid marks" });
  const ups = [], dels = [];
  for (const [k, st] of Object.entries(marks)) {
    const id = intId(k); if (!id) continue;
    if (st === "P" || st === "A" || st === "L") ups.push([id, st]); else if (st === "" || st === null) dels.push(id);
  }
  if (ups.length) await q(`INSERT INTO attendance(date,user_id,status)
    SELECT $1, x.uid, x.st FROM unnest($2::int[], $3::text[]) AS x(uid,st) JOIN users u ON u.id=x.uid AND u.role='student'
    ON CONFLICT(date,user_id) DO UPDATE SET status=excluded.status`, [date, ups.map((u) => u[0]), ups.map((u) => u[1])]);
  if (dels.length) await q("DELETE FROM attendance WHERE date=$1 AND user_id = ANY($2::int[])", [date, dels]);
  res.json({ ok: true });
}));
app.get("/api/attendance/me", need, A(async (req, res) => {
  const records = await q("SELECT date,status FROM attendance WHERE user_id=$1 ORDER BY date DESC LIMIT 400", [req.user.id]);
  const t = records.length, p = records.filter((r) => r.status !== "A").length;
  res.json({ records, pct: t ? Math.round(p / t * 100) : null });
}));

app.use("/api", (req, res) => res.status(404).json({ error: "Not found" }));
app.use(express.static(path.join(__dirname, "public"), { maxAge: "5m" }));
app.use((err, req, res, next) => {
  if (err.type === "entity.parse.failed") return res.status(400).json({ error: "Bad request" });
  console.error(err);
  res.status(500).json({ error: "Server error. Check the database connection (DATABASE_URL)." });
});
module.exports = app;
