import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/apiAuth";
import { logAudit } from "@/lib/audit";

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const { session: authSession, error } = await requireAdmin();
  if (error) return error;

  const existing = await prisma.attendanceSession.findUnique({ where: { id: params.id } });
  if (!existing) return NextResponse.json({ error: "Attendance session not found" }, { status: 404 });

  await prisma.attendanceSession.delete({ where: { id: params.id } });
  await logAudit({
    userId: authSession!.user.id,
    action: "ATTENDANCE_SESSION_DELETED",
    affectedType: "AttendanceSession",
    affectedId: params.id,
    details: `Deleted attendance session ${existing.topic || "General"} on ${existing.date.toISOString().slice(0, 10)}`,
  });

  return NextResponse.json({ success: true });
}
