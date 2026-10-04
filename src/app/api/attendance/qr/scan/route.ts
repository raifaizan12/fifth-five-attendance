import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireStudent } from "@/lib/apiAuth";
import { notifyUsers } from "@/lib/notifications";
import { logAudit } from "@/lib/audit";

export async function POST(req: NextRequest) {
  const { session: authSession, error } = await requireStudent();
  if (error) return error;

  const token = String((await req.json()).token || "").trim();
  if (!token) return NextResponse.json({ error: "QR token is required" }, { status: 400 });

  const studentId = authSession!.user.studentId;
  if (!studentId) return NextResponse.json({ error: "Student profile not found" }, { status: 400 });

  const qrSession = await prisma.attendanceSession.findUnique({
    where: { qrToken: token },
    include: { subject: true },
  });

  if (!qrSession || !qrSession.qrExpiresAt || qrSession.qrExpiresAt.getTime() <= Date.now()) {
    return NextResponse.json({ error: "This QR attendance session has expired or is no longer active." }, { status: 410 });
  }

  const existing = await prisma.attendanceRecord.findUnique({
    where: { sessionId_studentId: { sessionId: qrSession.id, studentId } },
  });
  if (existing) {
    return NextResponse.json({ success: true, alreadyMarked: true, status: existing.status, subject: qrSession.subject.name });
  }

  const record = await prisma.attendanceRecord.create({
    data: { sessionId: qrSession.id, studentId, status: "PRESENT" },
  });

  const userId = authSession!.user.id;
  await notifyUsers([userId], {
    title: "Attendance recorded",
    message: `${qrSession.subject.name}: you have been marked PRESENT.`,
    kind: "ATTENDANCE",
    href: "/portal",
  });

  await logAudit({
    userId,
    action: "QR_ATTENDANCE_SCANNED",
    affectedType: "AttendanceRecord",
    affectedId: record.id,
    details: `Scanned QR attendance for ${qrSession.subject.name}`,
  });

  return NextResponse.json({ success: true, alreadyMarked: false, status: record.status, subject: qrSession.subject.name });
}
