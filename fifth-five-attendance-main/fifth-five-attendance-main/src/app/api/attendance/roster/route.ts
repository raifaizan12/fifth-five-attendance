import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/apiAuth";

export async function GET(req: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const subjectId = searchParams.get("subjectId");
  const date = searchParams.get("date");
  const topic = searchParams.get("topic") || "General";

  const students = await prisma.student.findMany({
    where: { isActive: true },
    orderBy: { fullName: "asc" },
  });

  let existing: Record<string, string> = {};
  if (subjectId && date) {
    const existingSession = await prisma.attendanceSession.findUnique({
      where: { subjectId_date_topic: { subjectId, date: new Date(date), topic } },
      include: { records: true },
    });
    if (existingSession) {
      existing = Object.fromEntries(existingSession.records.map((r) => [r.studentId, r.status]));
    }
  }

  return NextResponse.json({
    students: students.map((s) => ({
      id: s.id,
      fullName: s.fullName,
      iubId: s.iubId,
      section: s.section,
      existingStatus: existing[s.id] || null,
    })),
  });
}
