import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/apiAuth";
import { logAudit } from "@/lib/audit";
import { notifyUsers } from "@/lib/notifications";

const schema = z.object({
  subjectId: z.string().min(1),
  teacherId: z.string().optional(),
  date: z.string().regex(/^\\d{4}-\\d{2}-\\d{2}$/, "Date must be YYYY-MM-DD"),
  topic: z.string().trim().max(200).optional(),
  records: z.array(
    z.object({
      studentId: z.string().min(1),
      status: z.enum(["PRESENT", "ABSENT", "LATE", "LEAVE"]),
    })
  ).min(1).max(1000),
});

export async function POST(req: NextRequest) {
  const { session: authSession, error } = await requireAdmin();
  if (error) return error;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
  }

  const { subjectId, teacherId, date, topic, records } = parsed.data;
  const topicValue = topic?.trim() || "General";
  const sessionDate = new Date(`${date}T00:00:00.000Z`);

  if (Number.isNaN(sessionDate.getTime()) || sessionDate.toISOString().slice(0, 10) !== date) {
    return NextResponse.json({ error: "Please provide a valid calendar date." }, { status: 400 });
  }

  // Reject duplicates instead of letting repeated input silently overwrite itself.
  const studentIds = records.map((record) => record.studentId);
  if (new Set(studentIds).size !== studentIds.length) {
    return NextResponse.json({ error: "The attendance list contains duplicate students." }, { status: 400 });
  }

  // Ensure the selected subject exists and submitted students are valid.
  const [subject, validStudents] = await Promise.all([
    prisma.subject.findUnique({ where: { id: subjectId }, select: { id: true } }),
    prisma.student.findMany({
      where: { id: { in: studentIds }, isActive: true },
      select: { id: true },
    }),
  ]);
  if (!subject) return NextResponse.json({ error: "Selected subject was not found." }, { status: 404 });
  if (validStudents.length !== studentIds.length) {
    return NextResponse.json({ error: "One or more students are inactive or no longer exist. Refresh the roster and try again." }, { status: 400 });
  }

  // Upsert the session; never delete or recreate existing sessions or attendance rows.
  const attendanceSession = await prisma.attendanceSession.upsert({
    where: {
      subjectId_date_topic: {
        subjectId,
        date: sessionDate,
        topic: topicValue,
      },
    },
    update: { teacherId: teacherId || undefined },
    create: {
      subjectId,
      teacherId: teacherId || undefined,
      date: sessionDate,
      topic: topicValue,
      createdBy: authSession!.user.id,
    },
  });

  // Snapshot existing statuses before updating. These snapshots are written to the
  // existing AuditLog table, so previous values remain reviewable without a schema reset.
  const existing = await prisma.attendanceRecord.findMany({
    where: { sessionId: attendanceSession.id, studentId: { in: studentIds } },
    select: { studentId: true, status: true },
  });
  const oldStatusByStudent = new Map(existing.map((record) => [record.studentId, record.status]));

  const results = await prisma.$transaction(
    records.map((record) =>
      prisma.attendanceRecord.upsert({
        where: {
          sessionId_studentId: {
            sessionId: attendanceSession.id,
            studentId: record.studentId,
          },
        },
        update: { status: record.status },
        create: {
          sessionId: attendanceSession.id,
          studentId: record.studentId,
          status: record.status,
        },
      })
    )
  );

  const changes = records.filter((record) => {
    const previous = oldStatusByStudent.get(record.studentId);
    return previous !== undefined && previous !== record.status;
  });

  // Audit the exact previous and new values for any edited attendance record.
  await Promise.all(changes.map((record) =>
    logAudit({
      userId: authSession!.user.id,
      action: "ATTENDANCE_MODIFIED",
      affectedType: "AttendanceRecord",
      affectedId: `${attendanceSession.id}:${record.studentId}`,
      details: `Attendance status changed from ${oldStatusByStudent.get(record.studentId)} to ${record.status}; session=${attendanceSession.id}; date=${date}; topic=${topicValue}`,
    })
  ));

  // Notify only students included in this attendance save, not the entire class.
  const submittedStudents = await prisma.student.findMany({
    where: { id: { in: studentIds }, isActive: true },
    select: { user: { select: { id: true, isActive: true } } },
  });
  const recipientIds = submittedStudents
    .map((student) => student.user)
    .filter((user): user is { id: string; isActive: boolean } => Boolean(user?.isActive))
    .map((user) => user.id);

  if (recipientIds.length) {
    await notifyUsers(recipientIds, {
      title: "Attendance updated",
      message: `Attendance was marked for ${topicValue}. Open Attendance to review your status.`,
      kind: "ATTENDANCE",
      href: "/portal",
    });
  }

  await logAudit({
    userId: authSession!.user.id,
    action: "ATTENDANCE_MARKED",
    affectedType: "AttendanceSession",
    affectedId: attendanceSession.id,
    details: `Saved attendance for ${records.length} students (${changes.length} existing records changed) on ${date} (${topicValue}). Existing records not included in this request were left unchanged.`,
  });

  const createdCount = records.filter((record) => !oldStatusByStudent.has(record.studentId)).length;
  return NextResponse.json({
    sessionId: attendanceSession.id,
    count: results.length,
    updatedCount: changes.length,
    createdCount,
  });
}
