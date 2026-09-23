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
