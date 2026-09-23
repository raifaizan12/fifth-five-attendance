import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAnyUser } from "@/lib/apiAuth";

export async function GET() {
  const { session, error } = await requireAnyUser();
  if (error) return error;
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
}
