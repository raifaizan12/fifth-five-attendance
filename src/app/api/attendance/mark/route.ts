import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/apiAuth";
import { logAudit } from "@/lib/audit";

const schema = z.object({
  subjectId: z.string(),
  teacherId: z.string().optional(),
  date: z.string(), // ISO date, e.g. "2026-08-16"
  topic: z.string().optional(),
  records: z.array(
    z.object({
      studentId: z.string(),
      status: z.enum(["PRESENT", "ABSENT", "LATE", "LEAVE"]),
    })
  ).min(1),
});

export async function POST(req: NextRequest) {
  const { session: authSession, error } = await requireAdmin();
  if (error) return error;

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
  }
  const { subjectId, teacherId, date, topic, records } = parsed.data;
  const topicValue = topic || "General";

  // Find-or-create the attendance session for this subject+date+topic.
  // The unique constraint on (subjectId, date, topic) prevents duplicate sessions.
  const attendanceSession = await prisma.attendanceSession.upsert({
    where: {
      subjectId_date_topic: {
        subjectId,
        date: new Date(date),
        topic: topicValue,
      },
    },
    update: { teacherId: teacherId || undefined },
    create: {
      subjectId,
      teacherId: teacherId || undefined,
      date: new Date(date),
      topic: topicValue,
      createdBy: authSession!.user.id,
    },
  });

  // Upsert each record — this both prevents duplicate attendance rows for the same
  // student+session, and transparently supports "editing" attendance later.
  const results = await prisma.$transaction(
    records.map((r) =>
      prisma.attendanceRecord.upsert({
        where: { sessionId_studentId: { sessionId: attendanceSession.id, studentId: r.studentId } },
        update: { status: r.status },
        create: { sessionId: attendanceSession.id, studentId: r.studentId, status: r.status },
      })
    )
  );

  await logAudit({
    userId: authSession!.user.id,
    action: "ATTENDANCE_MARKED",
    affectedType: "AttendanceSession",
    affectedId: attendanceSession.id,
    details: `Marked/updated attendance for ${records.length} students on ${date} (${topicValue})`,
  });

  return NextResponse.json({ sessionId: attendanceSession.id, count: results.length });
}
