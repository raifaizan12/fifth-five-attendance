"use strict";
const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const Database = require("better-sqlite3");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");

const PORT = process.env.PORT || 3000;
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, "data");
const CLASS_CODE = (process.env.CLASS_CODE || "").trim();
fs.mkdirSync(DATA_DIR, { recursive: true });

// ---------- secrets ----------
let JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  const f = path.join(DATA_DIR, ".jwt_secret");
  if (!fs.existsSync(f)) fs.writeFileSync(f, crypto.randomBytes(48).toString("hex"), { mode: 0o600 });
  JWT_SECRET = fs.readFileSync(f, "utf8").trim();
}

// ---------- database ----------
const db = new Database(path.join(DATA_DIR, "portal.db"));
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");
db.exec(`
CREATE TABLE IF NOT EXISTS users(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE COLLATE NOCASE,
  name TEXT NOT NULL,
  roll TEXT NOT NULL DEFAULT '',
  role TEXT NOT NULL CHECK(role IN ('cr','student')),
  pass_hash TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS announcements(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL, body TEXT NOT NULL DEFAULT '',
  created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS assignments(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL, subject TEXT NOT NULL DEFAULT '', due TEXT NOT NULL DEFAULT '',
  created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS completions(
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  assignment_id INTEGER NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
  PRIMARY KEY(user_id, assignment_id)
);
CREATE TABLE IF NOT EXISTS attendance(
  date TEXT NOT NULL,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK(status IN ('P','A','L')),
  PRIMARY KEY(date, user_id)
);
CREATE TABLE IF NOT EXISTS settings(key TEXT PRIMARY KEY, value TEXT NOT NULL);
`);
const getSet = (k, d) => { const r = db.prepare("SELECT value FROM settings WHERE key=?").get(k); return r ? r.value : d; };
const putSet = (k, v) => db.prepare("INSERT INTO settings(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value").run(k, String(v));
const settings = () => ({ maint: getSet("maint", "0") === "1", message: getSet("message", "The portal is being updated. Please check back soon.") });

// first-run CR account
if (!db.prepare("SELECT 1 FROM users WHERE role='cr'").get()) {
  const u = process.env.ADMIN_USERNAME || "cr";
  let p = process.env.ADMIN_PASSWORD;
  const generated = !p;
  if (generated) p = crypto.randomBytes(6).toString("hex");
  db.prepare("INSERT INTO users(username,name,roll,role,pass_hash,created_at) VALUES(?,?,?,?,?,?)")
    .run(u, "Class Representative", "", "cr", bcrypt.hashSync(p, 10), Date.now());
  console.log("\n=== First run: CR account created ===");
  console.log("username: " + u);
  if (generated) console.log("password: " + p + "   (change it after logging in)");
  console.log("=====================================\n");
}
if (!CLASS_CODE) console.warn("WARNING: CLASS_CODE is not set, so anyone can register as a student.");

// ---------- helpers ----------
const app = express();
app.set("trust proxy", 1);
app.disable("x-powered-by");
app.use(express.json({ limit: "100kb" }));
app.use((req, res, next) => {
  res.set({
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "same-origin",
    "Content-Security-Policy": "default-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'; img-src 'self' data:"
  });
  next();
});

const parseCookies = (h) => Object.fromEntries((h || "").split(";").map(s => s.trim().split("=")).filter(a => a[0]).map(([k, ...v]) => [k, decodeURIComponent(v.join("="))]));
const clean = (s, max) => String(s == null ? "" : s).trim().slice(0, max);
const userOut = (u) => ({ id: u.id, username: u.username, name: u.name, roll: u.roll, role: u.role });
const today = () => new Date().toISOString().slice(0, 10);
const validDate = (d) => /^\d{4}-\d{2}-\d{2}$/.test(d) && !isNaN(Date.parse(d));

function setCookie(req, res, userId) {
  const token = jwt.sign({ id: userId }, JWT_SECRET, { expiresIn: "7d" });
  res.cookie("token", token, { httpOnly: true, sameSite: "lax", secure: req.secure, maxAge: 7 * 864e5, path: "/" });
}

// CSRF defence: state-changing calls must carry a custom header (cannot be sent cross-site without CORS)
app.use("/api", (req, res, next) => {
  if (req.method !== "GET" && req.get("X-Requested-With") !== "portal") return res.status(403).json({ error: "Forbidden" });
  next();
});

// auth
app.use("/api", (req, res, next) => {
  const t = parseCookies(req.headers.cookie).token;
  if (t) {
    try {
      const { id } = jwt.verify(t, JWT_SECRET);
      const u = db.prepare("SELECT * FROM users WHERE id=?").get(id);
      if (u) req.user = u;
    } catch (e) { /* invalid token */ }
  }
  next();
});
const need = (req, res, next) => req.user ? next() : res.status(401).json({ error: "Please log in" });
const needCR = (req, res, next) => !req.user ? res.status(401).json({ error: "Please log in" }) : req.user.role !== "cr" ? res.status(403).json({ error: "Only the CR can do this" }) : next();

// maintenance: students are blocked from data endpoints
const OPEN = new Set(["/me", "/logout", "/settings", "/login", "/register"]);
app.use("/api", (req, res, next) => {
  const s = settings();
  if (s.maint && req.user && req.user.role !== "cr" && !OPEN.has(req.path)) return res.status(503).json({ error: "maintenance", message: s.message });
  next();
});

// login throttle
const tries = new Map();
function throttle(key) {
  const now = Date.now(), r = tries.get(key) || { n: 0, t: now };
  if (now - r.t > 15 * 60e3) { r.n = 0; r.t = now; }
  r.n++; tries.set(key, r);
  return r.n > 10;
}

// ---------- auth routes ----------
app.post("/api/login", (req, res) => {
  const username = clean(req.body.username, 40), password = String(req.body.password || "");
  if (throttle(req.ip + "|" + username.toLowerCase())) return res.status(429).json({ error: "Too many attempts. Try again in 15 minutes." });
  const u = db.prepare("SELECT * FROM users WHERE username=?").get(username);
  if (!u || !bcrypt.compareSync(password, u.pass_hash)) return res.status(401).json({ error: "Wrong username or password" });
  const s = settings();
  if (s.maint && u.role !== "cr") return res.status(503).json({ error: "maintenance", message: s.message });
  setCookie(req, res, u.id);
  res.json({ user: userOut(u), settings: s });
});
app.post("/api/register", (req, res) => {
  if (CLASS_CODE && clean(req.body.code, 80) !== CLASS_CODE) return res.status(403).json({ error: "Wrong class code" });
  const username = clean(req.body.username, 30), name = clean(req.body.name, 80), roll = clean(req.body.roll, 20), password = String(req.body.password || "");
  if (!/^[a-z0-9._-]{3,30}$/i.test(username)) return res.status(400).json({ error: "Username: 3-30 letters, numbers, . _ -" });
  if (!name) return res.status(400).json({ error: "Enter your name" });
  if (password.length < 6) return res.status(400).json({ error: "Password must be at least 6 characters" });
  if (db.prepare("SELECT 1 FROM users WHERE username=?").get(username)) return res.status(409).json({ error: "That username is taken" });
  const id = db.prepare("INSERT INTO users(username,name,roll,role,pass_hash,created_at) VALUES(?,?,?,?,?,?)")
    .run(username, name, roll, "student", bcrypt.hashSync(password, 10), Date.now()).lastInsertRowid;
  setCookie(req, res, id);
  res.json({ user: userOut(db.prepare("SELECT * FROM users WHERE id=?").get(id)), settings: settings() });
});
app.post("/api/logout", (req, res) => { res.clearCookie("token", { path: "/" }); res.json({ ok: true }); });
app.get("/api/me", (req, res) => res.json({ user: req.user ? userOut(req.user) : null, settings: settings() }));
app.get("/api/settings", (req, res) => res.json(settings()));
app.put("/api/settings", needCR, (req, res) => {
  if (req.body.maint !== undefined) putSet("maint", req.body.maint ? "1" : "0");
  if (req.body.message !== undefined) putSet("message", clean(req.body.message, 300) || "The portal is being updated. Please check back soon.");
  res.json(settings());
});
app.post("/api/me/password", need, (req, res) => {
  const cur = String(req.body.current || ""), nw = String(req.body.password || "");
  if (!bcrypt.compareSync(cur, req.user.pass_hash)) return res.status(400).json({ error: "Current password is wrong" });
  if (nw.length < 6) return res.status(400).json({ error: "New password must be at least 6 characters" });
  db.prepare("UPDATE users SET pass_hash=? WHERE id=?").run(bcrypt.hashSync(nw, 10), req.user.id);
  res.json({ ok: true });
});

// ---------- summary ----------
app.get("/api/summary", need, (req, res) => {
  const students = db.prepare("SELECT COUNT(*) c FROM users WHERE role='student'").get().c;
  const assignments = db.prepare("SELECT COUNT(*) c FROM assignments").get().c;
  if (req.user.role === "cr") return res.json({ students, assignments, announcements: db.prepare("SELECT COUNT(*) c FROM announcements").get().c });
  const done = db.prepare("SELECT COUNT(*) c FROM completions WHERE user_id=?").get(req.user.id).c;
  const a = db.prepare("SELECT SUM(status!='A') p, COUNT(*) t FROM attendance WHERE user_id=?").get(req.user.id);
  res.json({ students, pending: Math.max(assignments - done, 0), pct: a.t ? Math.round(a.p / a.t * 100) : null });
});

// ---------- announcements ----------
app.get("/api/announcements", need, (req, res) => res.json(db.prepare("SELECT id,title,body,created_at FROM announcements ORDER BY created_at DESC LIMIT 100").all()));
app.post("/api/announcements", needCR, (req, res) => {
  const title = clean(req.body.title, 120);
  if (!title) return res.status(400).json({ error: "Add a title" });
  const id = db.prepare("INSERT INTO announcements(title,body,created_at) VALUES(?,?,?)").run(title, clean(req.body.body, 2000), Date.now()).lastInsertRowid;
  res.json({ id });
});
app.delete("/api/announcements/:id", needCR, (req, res) => { db.prepare("DELETE FROM announcements WHERE id=?").run(req.params.id); res.json({ ok: true }); });

// ---------- assignments ----------
app.get("/api/assignments", need, (req, res) => {
  const rows = db.prepare(`SELECT a.id,a.title,a.subject,a.due,
    (SELECT COUNT(*) FROM completions c WHERE c.assignment_id=a.id) AS done_count,
    EXISTS(SELECT 1 FROM completions c WHERE c.assignment_id=a.id AND c.user_id=?) AS done
    FROM assignments a ORDER BY CASE WHEN a.due='' THEN 1 ELSE 0 END, a.due, a.id`).all(req.user.id);
  res.json({ total_students: db.prepare("SELECT COUNT(*) c FROM users WHERE role='student'").get().c, items: rows.map(r => ({ ...r, done: !!r.done })) });
});
app.post("/api/assignments", needCR, (req, res) => {
  const title = clean(req.body.title, 120), due = clean(req.body.due, 10);
  if (!title) return res.status(400).json({ error: "Add a title" });
  if (due && !validDate(due)) return res.status(400).json({ error: "Invalid due date" });
  const id = db.prepare("INSERT INTO assignments(title,subject,due,created_at) VALUES(?,?,?,?)").run(title, clean(req.body.subject, 60), due, Date.now()).lastInsertRowid;
  res.json({ id });
});
app.delete("/api/assignments/:id", needCR, (req, res) => { db.prepare("DELETE FROM assignments WHERE id=?").run(req.params.id); res.json({ ok: true }); });
app.post("/api/assignments/:id/done", need, (req, res) => {
  if (!db.prepare("SELECT 1 FROM assignments WHERE id=?").get(req.params.id)) return res.status(404).json({ error: "Not found" });
  if (req.body.done) db.prepare("INSERT OR IGNORE INTO completions(user_id,assignment_id) VALUES(?,?)").run(req.user.id, req.params.id);
  else db.prepare("DELETE FROM completions WHERE user_id=? AND assignment_id=?").run(req.user.id, req.params.id);
  res.json({ ok: true });
});

// ---------- students (CR) ----------
app.get("/api/students", needCR, (req, res) => {
  const total = db.prepare("SELECT COUNT(*) c FROM assignments").get().c;
  const rows = db.prepare(`SELECT u.id,u.username,u.name,u.roll,
    (SELECT COUNT(*) FROM attendance a WHERE a.user_id=u.id AND a.status='P') AS present,
    (SELECT COUNT(*) FROM attendance a WHERE a.user_id=u.id AND a.status='L') AS late,
    (SELECT COUNT(*) FROM attendance a WHERE a.user_id=u.id AND a.status='A') AS absent,
    (SELECT COUNT(*) FROM completions c WHERE c.user_id=u.id) AS done
    FROM users u WHERE u.role='student'`).all();
  rows.sort((a, b) => String(a.roll).localeCompare(String(b.roll), undefined, { numeric: true }) || a.name.localeCompare(b.name));
  res.json({ total_assignments: total, items: rows.map(r => { const t = r.present + r.late + r.absent; return { ...r, pct: t ? Math.round((r.present + r.late) / t * 100) : null }; }) });
});
app.post("/api/students", needCR, (req, res) => {
  const username = clean(req.body.username, 30), name = clean(req.body.name, 80), roll = clean(req.body.roll, 20), password = String(req.body.password || "");
  const role = req.body.role === "cr" ? "cr" : "student";
  if (!/^[a-z0-9._-]{3,30}$/i.test(username)) return res.status(400).json({ error: "Username: 3-30 letters, numbers, . _ -" });
  if (!name) return res.status(400).json({ error: "Enter a name" });
  if (password.length < 6) return res.status(400).json({ error: "Password must be at least 6 characters" });
  if (db.prepare("SELECT 1 FROM users WHERE username=?").get(username)) return res.status(409).json({ error: "That username is taken" });
  const id = db.prepare("INSERT INTO users(username,name,roll,role,pass_hash,created_at) VALUES(?,?,?,?,?,?)").run(username, name, roll, role, bcrypt.hashSync(password, 10), Date.now()).lastInsertRowid;
  res.json({ id });
});
app.post("/api/students/:id/password", needCR, (req, res) => {
  const pw = String(req.body.password || "");
  if (pw.length < 6) return res.status(400).json({ error: "Password must be at least 6 characters" });
  const r = db.prepare("UPDATE users SET pass_hash=? WHERE id=? AND role='student'").run(bcrypt.hashSync(pw, 10), req.params.id);
  res.status(r.changes ? 200 : 404).json(r.changes ? { ok: true } : { error: "Student not found" });
});
app.delete("/api/students/:id", needCR, (req, res) => {
  const r = db.prepare("DELETE FROM users WHERE id=? AND role='student'").run(req.params.id);
  res.status(r.changes ? 200 : 404).json(r.changes ? { ok: true } : { error: "Student not found" });
});

// ---------- attendance ----------
app.get("/api/attendance", needCR, (req, res) => {
  const date = validDate(req.query.date) ? req.query.date : today();
  const marks = {};
  db.prepare("SELECT user_id,status FROM attendance WHERE date=?").all(date).forEach(r => { marks[r.user_id] = r.status; });
  res.json({ date, students: db.prepare("SELECT id,name,roll FROM users WHERE role='student'").all().sort((a, b) => String(a.roll).localeCompare(String(b.roll), undefined, { numeric: true }) || a.name.localeCompare(b.name)), marks });
});
app.put("/api/attendance", needCR, (req, res) => {
  const date = clean(req.body.date, 10), marks = req.body.marks;
  if (!validDate(date)) return res.status(400).json({ error: "Invalid date" });
  if (date > today()) return res.status(400).json({ error: "Cannot mark a future date" });
  if (!marks || typeof marks !== "object") return res.status(400).json({ error: "Invalid marks" });
  const ids = new Set(db.prepare("SELECT id FROM users WHERE role='student'").all().map(r => String(r.id)));
  const up = db.prepare("INSERT INTO attendance(date,user_id,status) VALUES(?,?,?) ON CONFLICT(date,user_id) DO UPDATE SET status=excluded.status");
  const del = db.prepare("DELETE FROM attendance WHERE date=? AND user_id=?");
  db.transaction(() => {
    for (const [uid, st] of Object.entries(marks)) {
      if (!ids.has(String(uid))) continue;
      if (st === "P" || st === "A" || st === "L") up.run(date, uid, st);
      else if (st === "" || st === null) del.run(date, uid);
    }
  })();
  res.json({ ok: true });
});
app.get("/api/attendance/me", need, (req, res) => {
  const records = db.prepare("SELECT date,status FROM attendance WHERE user_id=? ORDER BY date DESC LIMIT 400").all(req.user.id);
  const t = records.length, p = records.filter(r => r.status !== "A").length;
  res.json({ records, pct: t ? Math.round(p / t * 100) : null });
});

// ---------- static + errors ----------
app.use("/api", (req, res) => res.status(404).json({ error: "Not found" }));
app.use(express.static(path.join(__dirname, "public"), { maxAge: "5m" }));
app.use((err, req, res, next) => {
  if (err.type === "entity.parse.failed") return res.status(400).json({ error: "Bad request" });
  console.error(err);
  res.status(500).json({ error: "Server error" });
});
app.listen(PORT, () => console.log("Class portal running on http://localhost:" + PORT));
