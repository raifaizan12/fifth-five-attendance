import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/apiAuth";
import { logAudit } from "@/lib/audit";

const studentSchema = z.object({
  fullName: z.string().min(2),
  iubId: z.string().min(2),
  regNumber: z.string().min(2),
  semester: z.string().min(1),
  program: z.string().optional(),
  section: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  password: z.string().min(6).optional(), // initial login password; defaults to regNumber if omitted
});

export async function GET(req: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim();

  const students = await prisma.student.findMany({
    where: q
      ? {
          OR: [
            { fullName: { contains: q, mode: "insensitive" } },
            { iubId: { contains: q, mode: "insensitive" } },
            { regNumber: { contains: q, mode: "insensitive" } },
          ],
        }
      : undefined,
    orderBy: { fullName: "asc" },
    include: { user: { select: { id: true, isActive: true } } },
  });

  return NextResponse.json({ students });
}

export async function POST(req: NextRequest) {
  const { session, error } = await requireAdmin();
  if (error) return error;

  const body = await req.json();
  const parsed = studentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
  }
  const data = parsed.data;

  const existing = await prisma.student.findFirst({
    where: { OR: [{ iubId: data.iubId }, { regNumber: data.regNumber }] },
  });
  if (existing) {
    return NextResponse.json({ error: "A student with this IUB ID or Registration Number already exists" }, { status: 409 });
  }

  const initialPassword = data.password || data.regNumber;
  const passwordHash = await bcrypt.hash(initialPassword, 12);

  const student = await prisma.student.create({
    data: {
      fullName: data.fullName,
      iubId: data.iubId,
      regNumber: data.regNumber,
      semester: data.semester,
      program: data.program || undefined,
      section: data.section || undefined,
      email: data.email || undefined,
      phone: data.phone || undefined,
      user: {
        create: {
          role: "STUDENT",
          loginId: data.iubId,
          passwordHash,
        },
      },
    },
  });

  await logAudit({
    userId: session!.user.id,
    action: "STUDENT_ADDED",
    affectedType: "Student",
    affectedId: student.id,
    details: `Added ${student.fullName} (${student.iubId}). Initial password set to ${data.password ? "custom value" : "registration number"}.`,
  });

  return NextResponse.json({ student, initialPassword }, { status: 201 });
}
