import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAnyUser } from "@/lib/apiAuth";
import { tallyRecords, computePercentage } from "@/lib/calc";

export async function GET(req: NextRequest) {
  const { session, error } = await requireAnyUser();
  if (error) return error;

  const { searchParams } = new URL(req.url);
  let studentId = searchParams.get("studentId") || undefined;
  const subjectId = searchParams.get("subjectId") || undefined;
  const from = searchParams.get("from") || undefined;
  const to = searchParams.get("to") || undefined;

  // Security: students may only ever query their own records, regardless of query params.
  if (session!.user.role === "STUDENT") {
    studentId = session!.user.studentId;
    if (!studentId) return NextResponse.json({ error: "No student profile linked to this account" }, { status: 400 });
  }

  if (!studentId) {
    return NextResponse.json({ error: "studentId is required" }, { status: 400 });
  }

  const records = await prisma.attendanceRecord.findMany({
    where: {
      studentId,
      session: {
        subjectId: subjectId || undefined,
        date: {
          gte: from ? new Date(from) : undefined,
          lte: to ? new Date(to) : undefined,
        },
      },
    },
    include: { session: { include: { subject: true, teacher: true } } },
    orderBy: { session: { date: "desc" } },
  });

  const overallCounts = tallyRecords(records);
  const overallPercentage = computePercentage(overallCounts);

  // Subject-wise breakdown
  const bySubjectMap = new Map<string, { subjectName: string; records: { status: string }[] }>();
  for (const r of records) {
    const key = r.session.subjectId;
    if (!bySubjectMap.has(key)) bySubjectMap.set(key, { subjectName: r.session.subject.name, records: [] });
    bySubjectMap.get(key)!.records.push({ status: r.status });
  }
  const bySubject = Array.from(bySubjectMap.entries()).map(([subjectId, v]) => {
    const counts = tallyRecords(v.records);
    return { subjectId, subjectName: v.subjectName, ...counts, percentage: computePercentage(counts) };
  });

  return NextResponse.json({
    records: records.map((r) => ({
      id: r.id,
      date: r.session.date,
      topic: r.session.topic,
      subject: r.session.subject.name,
      teacher: r.session.teacher?.fullName ?? null,
      status: r.status,
    })),
    overallCounts,
    overallPercentage,
    bySubject,
  });
}
