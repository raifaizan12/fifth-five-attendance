import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/apiAuth";
import { logAudit } from "@/lib/audit";

const updateSchema = z.object({
  fullName: z.string().min(2).optional(),
  semester: z.string().optional(),
  program: z.string().optional(),
  section: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  isActive: z.boolean().optional(),
  newPassword: z.string().min(6).optional(),
});

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const { error } = await requireAdmin();
  if (error) return error;

  const student = await prisma.student.findUnique({
    where: { id: params.id },
    include: { attendanceRecords: { include: { session: { include: { subject: true } } } } },
  });
  if (!student) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ student });
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const { session, error } = await requireAdmin();
  if (error) return error;

  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
  }
  const { newPassword, isActive, ...rest } = parsed.data;

  const student = await prisma.student.update({
    where: { id: params.id },
    data: {
      ...rest,
      email: rest.email || undefined,
    },
  });

  if (typeof isActive === "boolean") {
    await prisma.user.updateMany({ where: { studentId: student.id }, data: { isActive } });
  }

  if (newPassword) {
    const passwordHash = await bcrypt.hash(newPassword, 12);
    await prisma.user.updateMany({ where: { studentId: student.id }, data: { passwordHash } });
  }

  await logAudit({
    userId: session!.user.id,
    action: "STUDENT_EDITED",
    affectedType: "Student",
    affectedId: student.id,
    details: `Updated ${student.fullName} (${student.iubId})${newPassword ? "; password reset" : ""}`,
  });

  return NextResponse.json({ student });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const { session, error } = await requireAdmin();
  if (error) return error;

  const student = await prisma.student.findUnique({ where: { id: params.id } });
  if (!student) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.student.delete({ where: { id: params.id } });

  await logAudit({
    userId: session!.user.id,
    action: "STUDENT_REMOVED",
    affectedType: "Student",
    affectedId: params.id,
    details: `Removed ${student.fullName} (${student.iubId})`,
  });

  return NextResponse.json({ ok: true });
}
