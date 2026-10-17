# Class Portal (Vercel + Neon Postgres)

CR/teacher login, student login, **subject-wise attendance with reports (CSV / print to PDF)**, assignments,
announcements and maintenance mode.
Backend: Express as a Vercel serverless function (`api/index.js`). Database: Neon Postgres.
Frontend: `public/index.html` (no build step).

## Deploy on Vercel (same project / same link)
1. Neon: create a project at neon.tech, copy the **pooled** connection string.
2. Vercel -> your project -> Settings -> Environment Variables, add (Production, Preview, Development):
   - `DATABASE_URL`  (Neon string)
   - `ADMIN_USERNAME`, `ADMIN_PASSWORD`  (your CR login)
   - `CLASS_CODE`  (code students need to sign up)
3. Push this repo to GitHub. Vercel redeploys automatically.
4. Open the site and log in with ADMIN_USERNAME / ADMIN_PASSWORD. Tables are created on first request.

`vercel.json` already sets Framework = Other, no build command, output folder `public`.
If a deploy fails, check Settings -> General: remove any old Build Command / Output Directory overrides.

## Run locally
```
npm install
# set DATABASE_URL, ADMIN_PASSWORD, CLASS_CODE in your shell, then:
node server.js
```

## Notes
- Change the CR password after first login (Account tab). Changing ADMIN_PASSWORD later does not
  change an existing account; it is only used when no CR exists.
- The CR can add more CR accounts in the Students tab.
- Database data lives in Neon, so redeploys never erase it.

## Subjects and reports
- CR: Attendance tab -> add subjects (Mathematics, Physics...), pick subject + date, mark Present/Absent/Late.
- CR: Report tab -> choose subject (or all), date range, Generate. Download CSV (opens in Excel) or
  Print / Save as PDF. Below 75% is highlighted.
- Students see their attendance per subject and overall.
- Upgrading an older install: existing attendance is moved automatically into a subject called "General".
