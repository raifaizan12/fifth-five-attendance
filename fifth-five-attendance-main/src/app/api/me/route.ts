import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAnyUser } from "@/lib/apiAuth";

export async function GET() {
  const { session, error } = await requireAnyUser();
  if (error) return error;
<<<<<<< HEAD

  if (session!.user.role === "STUDENT") {
    const studentId = session!.user.studentId;
    if (!studentId) return NextResponse.json({ error: "Student profile not found" }, { status: 404 });
    const student = await prisma.student.findUnique({ where: { id: studentId } });
    if (!student) return NextResponse.json({ error: "Student profile not found" }, { status: 404 });
    return NextResponse.json({
      user: { role: "STUDENT", student: { id: student.id, fullName: student.fullName, iubId: student.iubId, regNumber: student.regNumber, semester: student.semester, program: student.program, section: student.section, email: student.email } },
    });
  }

  return NextResponse.json({ user: { role: "ADMIN", name: session!.user.name || "Class Representative" } });
=======
  const user = await prisma.user.findUnique({
    where: { id: session!.user.id },
    include: { student: true },
  });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
  return NextResponse.json({
    user: {
      role: user.role,
      student: user.student
        ? {
            fullName: user.student.fullName,
            iubId: user.student.iubId,
            regNumber: user.student.regNumber,
            semester: user.student.semester,
            program: user.student.program,
            section: user.student.section,
            email: user.student.email,
          }
        : undefined,
    },
  });
>>>>>>> 4c776aa (Premium portal UI and CR management updates)
}
