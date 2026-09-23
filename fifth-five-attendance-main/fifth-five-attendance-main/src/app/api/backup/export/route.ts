import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/apiAuth";
import { toCsv } from "@/lib/csv";
import { logAudit } from "@/lib/audit";

export async function GET(req: NextRequest) {
  const { session, error } = await requireAdmin();
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const format = searchParams.get("format") || "json";
  const dateStamp = new Date().toISOString().slice(0, 10);

  if (format === "students-csv") {
    const students = await prisma.student.findMany({ orderBy: { fullName: "asc" } });
    const csv = toCsv(
      students.map((s) => ({
        Name: s.fullName,
        "IUB ID": s.iubId,
        "Registration Number": s.regNumber,
        Semester: s.semester,
        Section: s.section,
        Email: s.email || "",
        Phone: s.phone || "",
      }))
    );
    await logAudit({ userId: session!.user.id, action: "BACKUP_EXPORTED", affectedType: "Student", details: "Students CSV backup" });
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="students-backup-${dateStamp}.csv"`,
      },
    });
  }

  // Full JSON backup — everything needed to fully restore the class data.
  const [students, subjects, teachers, sessions, records, settings] = await Promise.all([
    prisma.student.findMany(),
    prisma.subject.findMany(),
    prisma.teacher.findMany(),
    prisma.attendanceSession.findMany(),
    prisma.attendanceRecord.findMany(),
    prisma.settings.findMany(),
  ]);

  const backup = {
    exportedAt: new Date().toISOString(),
    version: 1,
    students,
    subjects,
    teachers,
    attendanceSessions: sessions,
    attendanceRecords: records,
    settings,
  };

  await logAudit({ userId: session!.user.id, action: "BACKUP_EXPORTED", affectedType: "Database", details: "Full JSON backup" });

  return new NextResponse(JSON.stringify(backup, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="attendance-full-backup-${dateStamp}.json"`,
    },
  });
}
