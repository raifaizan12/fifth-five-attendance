import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/apiAuth";
import { toCsv } from "@/lib/csv";
import { tallyRecords, computePercentage } from "@/lib/calc";

export async function GET(req: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const studentId = searchParams.get("studentId") || undefined;
  const subjectId = searchParams.get("subjectId") || undefined;
  const from = searchParams.get("from") || undefined;
  const to = searchParams.get("to") || undefined;

  const records = await prisma.attendanceRecord.findMany({
    where: {
      studentId,
      session: {
        subjectId,
        date: { gte: from ? new Date(from) : undefined, lte: to ? new Date(to) : undefined },
      },
    },
    include: { student: true, session: { include: { subject: true } } },
    orderBy: [{ student: { fullName: "asc" } }, { session: { date: "desc" } }],
  });

  const grouped = new Map<string, { student: typeof records[number]["student"]; recs: { status: string }[] }>();
  for (const r of records) {
    if (!grouped.has(r.studentId)) grouped.set(r.studentId, { student: r.student, recs: [] });
    grouped.get(r.studentId)!.recs.push({ status: r.status });
  }

  const rows = Array.from(grouped.values()).map(({ student, recs }) => {
    const c = tallyRecords(recs);
    return {
      "Student Name": student.fullName,
      "IUB ID": student.iubId,
      "Registration Number": student.regNumber,
      "Total Classes": c.total,
      Present: c.present,
      Absent: c.absent,
      Late: c.late,
      Leave: c.leave,
      "Percentage": computePercentage(c),
    };
  });

  const csv = toCsv(rows);
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="attendance-report-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
