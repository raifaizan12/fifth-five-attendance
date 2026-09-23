# 5TH-5M ATTENDANCE PORTAL
BS Information Technology · The Islamia University of Bahawalpur (IUB)

A complete, working attendance management system: CR/Admin dashboard, mobile-friendly
quick attendance marking, student self-service portal, CSV import/export, reports,
audit log, and backups — deployable for **$0**.

---

## 1. What this actually is

- **Frontend + Backend:** Next.js 14 (App Router), one codebase, deployed as one app.
- **Database:** PostgreSQL, accessed through Prisma ORM.
- **Auth:** NextAuth (credentials-based), passwords hashed with bcrypt, JWT sessions,
  server-side role checks on every API route (never trusts the frontend).
- **No third-party trackers.** No analytics, no ads, no unrelated external APIs. The
  only network calls this app makes are to your own database.

Every button in the UI is wired to a real, working API route — there is no mock data.

---

## 2. The free architecture (and its real limits)

| Piece | Free provider | Real limitation you should know about |
|---|---|---|
| Frontend + backend hosting | **Vercel** (Hobby/free plan) | Fine for a class-sized app. Serverless functions have a ~10s execution timeout on the free plan (not an issue here) and 100GB bandwidth/month. Non-commercial use only per Vercel's Hobby terms. |
| Database | **Neon** (free tier) — recommended, or Supabase free tier | Neon free tier: ~0.5GB storage, database "sleeps" after inactivity and cold-starts in ~1s on the next request (you may notice a brief delay on the very first request after idle time). Plenty for one class's attendance data. |
| Public URL | Vercel-generated subdomain, e.g. `fifth-five-attendance.vercel.app` | Free forever, shareable with classmates. A custom domain is optional and NOT required — skip it entirely. |

Nothing here requires a credit card. If Neon or Vercel ever ask for payment details for
something you didn't intend to use, stop and skip that step — the core deployment
described below does not need it.

---

## 3. One-time setup

### Step A — Create your free database (Neon)
1. Go to https://neon.tech → Sign up (free) → "Create a project".
2. Once created, copy the **connection string** shown (starts with `postgresql://...`).
   Make sure it includes `?sslmode=require` at the end.

### Step B — Push the code to GitHub
1. Create a free GitHub account if you don't have one.
2. Create a new repository, e.g. `fifth-five-attendance`.
3. Upload/push everything in this project folder to that repository.

### Step C — Deploy on Vercel
1. Go to https://vercel.com → Sign up free (you can sign in with GitHub).
2. Click "Add New Project" → import your `fifth-five-attendance` repo.
3. In the **Environment Variables** section, add:
   - `DATABASE_URL` = the Neon connection string from Step A
   - `NEXTAUTH_SECRET` = a random string (generate one at
     https://generate-secret.vercel.app/32 or run `openssl rand -base64 32` locally)
   - `NEXTAUTH_URL` = leave this out for now — Vercel sets `VERCEL_URL`
     automatically, but for NextAuth on Vercel it's simplest to add it **after**
     your first deploy, once you know your app's URL (e.g.
     `https://fifth-five-attendance.vercel.app`). Add it, then redeploy.
   - `SEED_ADMIN_EMAIL` = the CR's login email, e.g. `cr@fifthfive.iub.edu.pk`
   - `SEED_ADMIN_PASSWORD` = a strong password for the CR account
4. Click **Deploy**. Vercel will run `npm install` and `npm run build` (which also
   runs `prisma generate`) automatically.

### Step D — Create the database tables and the CR account
Once deployed, you need to run the database migration and seed script **once**.
The easiest way (no local setup needed):
1. Install [Vercel CLI] locally isn't required — instead, run these commands from
   your own computer (with [Node.js](https://nodejs.org) installed):
   ```bash
   git clone <your-repo-url>
   cd fifth-five-attendance
   npm install
   ```
2. Create a `.env` file (copy `.env.example`) and paste in the same `DATABASE_URL`,
   `SEED_ADMIN_EMAIL`, and `SEED_ADMIN_PASSWORD` you used on Vercel.
3. Push the schema to your live database and seed the CR account:
   ```bash
   npx prisma db push
   npm run seed
   ```
4. That's it — your live database now has all the tables and one CR account.

### Step E — Update NEXTAUTH_URL and redeploy
Go back to your Vercel project → Settings → Environment Variables → add/update
`NEXTAUTH_URL` to your actual deployed URL (e.g. `https://fifth-five-attendance.vercel.app`),
then trigger a redeploy (Vercel → Deployments → "..." → Redeploy).

### Step F — Log in
Visit your URL, choose "Class Representative", and log in with the
`SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` you set. From there:
1. Go to **Subjects** → add your subjects and teachers.
2. Go to **Students** → add students one by one, or **Import CSV** (see format below).
3. Share the URL with your class. Each student logs in with their **IUB ID** as the
   username; their initial password is their **Registration Number** (tell them to
   note it down — you can reset it any time from Students → Edit).

---

## 4. CSV import format

Upload a `.csv` file with these exact column headers:

```
Name,IUB ID,Registration Number,Semester,Section,Email,Phone
```

`Email`, `Phone`, and `Section` are optional. The importer reports successful rows,
duplicate rows (already-existing IUB ID or Reg #), and invalid rows with the reason.

---

## 5. Daily use (mobile-friendly)

**Marking attendance (CR):**
Attendance → pick Subject, Teacher, Date → "Load Student List" → "Mark All Present"
→ tap any student to change their status (Present/Absent/Late/Leave) → "Save
Attendance". Re-loading the same subject+date lets you edit a session you already
saved (no duplicates are ever created — the database enforces this).

**Viewing attendance (Student):**
Students log in and immediately see their overall %, subject-wise breakdown, and full
history. They cannot see anyone else's records or reach any CR page — this is
enforced on the server, not just hidden in the UI.

---

## 6. Backups

CR → Backup page:
- **Full Backup (JSON)** — every table, one file, one click.
- **Students (CSV)** — re-importable student list.
- **Attendance (CSV)** — from the Reports page, "Export CSV" with no filters applied
  exports everything.

Restore: re-import the students CSV any time. For a full database restore (e.g. moving
to a new free database), use Neon's own backup/restore feature in its dashboard, or
have a developer replay the JSON backup through Prisma.

---

## 7. Security notes

- Passwords are hashed with bcrypt (12 rounds) — never stored in plain text.
- Every admin API route re-checks the caller's role server-side (`requireAdmin()`),
  in addition to the route middleware — the frontend is never trusted alone.
- Students can only ever query their own attendance; the API ignores any attempt to
  request another student's ID.
- Login attempts are rate-limited (8 attempts per 10 minutes per identifier).
- All inputs are validated with Zod before touching the database.
- Prisma parameterizes all queries (no SQL injection surface).

---

## 8. Local development

```bash
npm install
cp .env.example .env   # fill in DATABASE_URL, NEXTAUTH_SECRET, etc.
npx prisma db push
npm run seed
npm run dev
```
Visit http://localhost:3000.

---

## 9. Project structure

```
prisma/schema.prisma       All database tables, relations, constraints
prisma/seed.ts             Creates the first CR account + default settings
src/lib/                   Prisma client, auth config, rate limiter, CSV/calc helpers
src/middleware.ts          Role-based route protection
src/app/api/               All backend logic (students, subjects, attendance, reports, backup, audit)
src/app/(cr)/               CR dashboard pages
src/app/(student)/portal/  Student self-service page
src/app/login/             Shared login page
```
  


## Timetable
The CR manages the timetable at `/timetable`. Students view it at `/portal/schedule`. Both use `/api/timetable`; only the CR can create, edit, or delete entries. The timetable feature does not replace or modify the existing authentication middleware.


## Class Hub (CR → Student Portal)

The latest version adds a CR-managed Class Hub with: announcements, assignments/deadlines, exams & quizzes, study-material links, and class polls. Existing Class Photos and Timetable remain available and are also managed by the CR.

### Database update after pulling this version
Run:

```bash
npx prisma db push
npx prisma generate
```

Then deploy normally. The new data models are `Announcement`, `Assignment`, `ExamEvent`, `StudyMaterial`, `ClassPoll`, and `PollVote`.
