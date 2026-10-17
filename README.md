# Fifth Five Smart Campus Portal

A separate upgraded edition of the Fifth Five class portal. It keeps the existing Next.js + Prisma + PostgreSQL application structure and adds a cohesive professional light design system, installable-PWA metadata, and an optional authenticated AI academic assistant.

## Highlights

- Student and CR workspaces with existing attendance, student records, timetable, subjects, class hub, QR attendance, analytics, reports, requests, settings and audit tools.
- Professional light theme with blue/violet accents, subtle glass surfaces, improved contrast, responsive spacing and reduced-motion support.
- Student password management and role-based authentication from the existing project.
- Service-worker notification support already present in the source; actual web push requires VAPID keys and HTTPS in production.
- Installable PWA manifest and app metadata.
- New **AI Study Assistant** at `/portal/assistant`, with server-side API-key handling, input limits, error handling and academic-integrity guidance.

## Requirements

- Node.js 20 or newer
- PostgreSQL database (Neon is supported)
- npm

## Local setup

1. Copy `.env.example` to `.env`.
2. Set `DATABASE_URL` to your PostgreSQL connection string.
3. Set a long random `NEXTAUTH_SECRET` and the correct `NEXTAUTH_URL`.
4. Configure the initial admin/CR seed credentials before running the seed script.
5. Install dependencies and initialize the database:

   ```powershell
   npm ci
   npx prisma generate
   npx prisma db push
   npm run seed
   npm run dev
   ```

6. Open `http://localhost:3000`.

Use the project’s established database and seed process carefully. Do not run destructive database commands against production without a backup and review.

## Optional AI Study Assistant

The assistant is available in the student navigation. To enable responses, set these server-side environment variables in `.env` and in your deployment provider:

```env
OPENAI_API_KEY="your-server-side-api-key"
OPENAI_MODEL="gpt-4o-mini"
```

Then redeploy/restart. Never use a `NEXT_PUBLIC_` prefix for the API key. AI requests require an authenticated session and are limited to recent messages; the assistant is for study support and can make mistakes. Review usage and provider costs before enabling it for a full class.

If no key is configured, the assistant displays a clear configuration message instead of pretending to generate answers.

## Web push setup

Configure `VAPID_SUBJECT`, `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, and `NEXT_PUBLIC_VAPID_PUBLIC_KEY` in the environment. Web push requires HTTPS in production and user permission. Browser support and notification permission vary by device. Test subscriptions and delivery in the deployed environment before relying on alerts for time-critical class changes.

## Deployment notes

- Deploy this folder as a **separate project** if you want to keep the existing live project untouched.
- Provision a separate database for testing if you want data isolation. The source code does not copy your production database or credentials.
- Add environment variables in the hosting dashboard; never commit `.env` or secrets.
- Run a production build and test login, attendance, timetable, student import, notifications and role permissions before inviting students.
- AI assistant and web push depend on the external credentials described above; they are not active merely because the UI is present.

## Feature status

| Capability | Status |
|---|---|
| Existing student/CR academic workflows | Retained from the supplied project; verify against your own environment |
| Premium light UI refresh | Added |
| PWA manifest and app metadata | Added; installability depends on deployment and browser requirements |
| AI study assistant UI and authenticated API | Added; requires `OPENAI_API_KEY` |
| Web push | Existing service-worker/subscription flow retained; requires VAPID configuration and end-to-end testing |
| Teacher-specific dashboard and permissions | Not introduced as a new separate role in this edition |
| Fully offline attendance synchronization | Not claimed as implemented; requires a separately tested secure queue/sync workflow |

## Security reminders

Keep secrets server-side, use HTTPS, maintain database backups, restrict CR access, and verify every API route’s authorization before production use. Do not place private student data or passwords into AI prompts.
