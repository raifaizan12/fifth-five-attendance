import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAnyUser } from "@/lib/apiAuth";
import { tallyRecords, computePercentage } from "@/lib/calc";

// Any logged-in user (CR or student) may read the leaderboard — it only ever
// exposes name + percentage, nothing a classmate couldn't already see on a
// printed attendance sheet.
export async function GET() {
  const { session, error } = await requireAnyUser();
  if (error) return error;

  const records = await prisma.attendanceRecord.findMany({
    include: { student: true },
  });

  const grouped = new Map<string, { student: (typeof records)[number]["student"]; recs: { status: string }[] }>();
  for (const r of records) {
    if (!grouped.has(r.studentId)) grouped.set(r.studentId, { student: r.student, recs: [] });
    grouped.get(r.studentId)!.recs.push({ status: r.status });
  }

  const ranked = Array.from(grouped.values())
    .map(({ student, recs }) => {
      const counts = tallyRecords(recs);
      return {
        studentId: student.id,
        fullName: student.fullName,
        iubId: student.iubId,
        total: counts.present + counts.absent + counts.late + counts.leave,
        present: counts.present,
        percentage: computePercentage(counts),
      };
    })
    // Ties broken by who has attended more classes outright — a student
    // present for 40/40 should outrank one present for 4/4.
    .sort((a, b) => b.percentage - a.percentage || b.present - a.present)
    .map((row, i) => ({ ...row, rank: i + 1 }));

  const podium = ranked.slice(0, 10);

  let me: (typeof ranked)[number] | null = null;
  if (session!.user.role === "STUDENT" && session!.user.studentId) {
    me = ranked.find((r) => r.studentId === session!.user.studentId) || null;
  }

  return NextResponse.json({
    podium,
    totalStudents: ranked.length,
    me,
  });
}
