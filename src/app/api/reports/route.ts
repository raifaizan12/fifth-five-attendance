import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/apiAuth";
import { tallyRecords, computePercentage } from "@/lib/calc";

export async function GET(req: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const studentId = searchParams.get("studentId") || undefined;
  const subjectId = searchParams.get("subjectId") || undefined;
  const status = searchParams.get("status") || undefined;
  const from = searchParams.get("from") || undefined;
  const to = searchParams.get("to") || undefined;

  const records = await prisma.attendanceRecord.findMany({
    where: {
      studentId,
      status: status as any,
      session: {
        subjectId,
        date: { gte: from ? new Date(from) : undefined, lte: to ? new Date(to) : undefined },
      },
    },
    include: { student: true, session: { include: { subject: true } } },
    orderBy: [{ student: { fullName: "asc" } }, { session: { date: "desc" } }],
  });

  // Per-student summary (grouped)
  const grouped = new Map<string, { student: typeof records[number]["student"]; recs: { status: string }[] }>();
  for (const r of records) {
    if (!grouped.has(r.studentId)) grouped.set(r.studentId, { student: r.student, recs: [] });
    grouped.get(r.studentId)!.recs.push({ status: r.status });
  }
  const summary = Array.from(grouped.values()).map(({ student, recs }) => {
    const counts = tallyRecords(recs);
    return {
      studentId: student.id,
      fullName: student.fullName,
      iubId: student.iubId,
      ...counts,
      percentage: computePercentage(counts),
    };
  });

  return NextResponse.json({
    rows: records.map((r) => ({
      studentName: r.student.fullName,
      iubId: r.student.iubId,
      subject: r.session.subject.name,
      date: r.session.date,
      status: r.status,
    })),
    summary,
  });
}
