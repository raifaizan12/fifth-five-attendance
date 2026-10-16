POLL VOTING FIX FILES

Replace these files in your EXISTING project (do not replace the whole project):
1. src/app/(cr)/hub/page.tsx
2. src/app/(student)/portal/page.tsx
3. src/app/api/class-hub/route.ts
4. prisma/schema.prisma (only if your project does not already contain ClassPoll and PollVote models)

The CR/Admin Class Hub loads vote records with student name, IUB ID/registration number, selected option, and date/time.
Students can vote once per poll; a second vote updates their existing vote.

After copying, run:
npx prisma db push
git add .
git commit -m "Fix poll voting and vote records"
git push origin main

STUDENT PASSWORD SETUP
----------------------
Student accounts created by the CR/CSV import use the student's IUB ID as the login username and the registration number as the initial password (unless a custom initial password was set). Students should sign in at /login, open Student Portal > Password, verify their current password, and set a private password of at least 8 characters. The password endpoint requires an authenticated student session, verifies the current password, hashes the new password with bcrypt, and writes an audit event. No database schema change is required for this workflow.

Before deploying, back up the production Neon database and run npm install followed by npm run build. Do not run destructive database resets.
