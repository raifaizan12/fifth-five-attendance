import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/apiAuth";

export async function GET(req: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const subjectId = searchParams.get("subjectId") || undefined;
  const limit = Number(searchParams.get("limit") || 20);

  const sessions = await prisma.attendanceSession.findMany({
    where: subjectId ? { subjectId } : undefined,
    orderBy: { date: "desc" },
    take: limit,
    include: {
      subject: true,
      teacher: true,
      records: { select: { status: true } },
    },
  });

  const shaped = sessions.map((s) => ({
    id: s.id,
    date: s.date,
    topic: s.topic,
    subject: s.subject.name,
    teacher: s.teacher?.fullName ?? null,
    present: s.records.filter((r) => r.status === "PRESENT").length,
    absent: s.records.filter((r) => r.status === "ABSENT").length,
    late: s.records.filter((r) => r.status === "LATE").length,
    leave: s.records.filter((r) => r.status === "LEAVE").length,
    total: s.records.length,
  }));

  return NextResponse.json({ sessions: shaped });
}
