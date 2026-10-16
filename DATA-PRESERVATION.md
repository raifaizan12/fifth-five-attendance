# Production database and attendance preservation

This update is designed to use the existing database. It does not include a database reset, seed run,
data deletion, or a destructive schema command.

## Before deploying

1. Confirm Vercel's `DATABASE_URL` is the same Neon/PostgreSQL database that currently stores attendance.
2. Take a database backup or Neon restore point before applying any schema change.
3. Review `prisma/schema.prisma` against the live database. This update's attendance-save changes use
   existing tables and do not require a schema migration.
4. Deploy the code without changing `DATABASE_URL`.

## Attendance save behavior

- Existing attendance sessions are reused by subject, date, and topic.
- Existing student/session attendance records are updated in place when a status changes.
- Existing records omitted from a save request are left untouched.
- Duplicate student IDs in a single request are rejected.
- Attendance status changes are written to the existing `AuditLog` table with previous and new status.
- Notifications target only the students included in that attendance save.

## Avoid

- `prisma migrate reset`
- `prisma db push --accept-data-loss`
- Running `npm run seed` against production
- Replacing the production `DATABASE_URL` with a new/empty database URL

A deployment can still fail for environment or code reasons; do not attempt to fix that by deleting
or recreating production data. Inspect the build/deployment logs and resolve the specific error.
