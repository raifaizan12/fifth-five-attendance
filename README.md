# Class Portal

A class portal with **CR/teacher login**, **student login** and a **SQLite database**.
Node.js + Express backend, single-page frontend (no build step).

## Features
- Student sign-up (protected by a class code) and login; CR/teacher login
- CR: post announcements and assignments, mark attendance (Present/Absent/Late) by date,
  view all students with attendance % and assignments done, add students or other CR accounts,
  reset passwords, remove students, turn **maintenance mode** on/off with a message
- Students: see announcements, tick off assignments, see their own attendance record
- Passwords hashed with bcrypt, login cookies are httpOnly, login attempts are rate limited

## Run locally
```
npm install
cp .env.example .env      # then edit it (on Windows: copy .env.example .env)
node --env-file=.env server.js    # Node 20.6+; or just set the variables in your shell
```
Open http://localhost:3000 and log in with ADMIN_USERNAME / ADMIN_PASSWORD.
If you skip ADMIN_PASSWORD, one is generated and printed in the console on first run.

## Deploy
The app needs a place to keep `portal.db`, so use a host with a **persistent disk or volume**.
Free tiers whose disk resets on every deploy will lose your data.

**Any VPS (DigitalOcean, Hetzner, AWS Lightsail...)** with Docker:
```
cp .env.example .env     # edit values
docker compose up -d --build
```
Put Caddy or Nginx in front for HTTPS (for example `caddy reverse-proxy --from yourdomain.com --to localhost:3000`).

**Railway / Fly.io / Render (paid disk):** deploy this folder (the Dockerfile is detected),
attach a volume mounted at `/data`, and set the environment variables from `.env.example`
in the dashboard. `DATA_DIR` is already `/data` in the Docker image.

Always serve over HTTPS in production so login cookies stay private.

## Backups
Copy the `data/` folder (or the `/data` volume): `portal.db` is the whole database.

## Android app
Your Android Studio WebView project can load this site: in `MainActivity.java` change
`web.loadUrl("file:///android_asset/index.html")` to `web.loadUrl("https://your-domain.com")`.

## Notes
- Usernames are case-insensitive. Passwords need 6+ characters.
- The CR sees students' data; students only see their own attendance and completion.
- To change the class code, edit `CLASS_CODE` and restart.
