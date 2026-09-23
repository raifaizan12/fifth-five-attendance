import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/apiAuth";
import { logAudit } from "@/lib/audit";

const schema = z.object({
  fullName: z.string().min(2).optional(),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
});

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const { session, error } = await requireAdmin();
  if (error) return error;
  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const teacher = await prisma.teacher.update({ where: { id: params.id }, data: parsed.data });
  await logAudit({ userId: session!.user.id, action: "TEACHER_EDITED", affectedType: "Teacher", affectedId: teacher.id, details: teacher.fullName });
  return NextResponse.json({ teacher });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const { session, error } = await requireAdmin();
  if (error) return error;
  const teacher = await prisma.teacher.findUnique({ where: { id: params.id } });
  if (!teacher) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.teacher.delete({ where: { id: params.id } });
  await logAudit({ userId: session!.user.id, action: "TEACHER_DELETED", affectedType: "Teacher", affectedId: params.id, details: teacher.fullName });
  return NextResponse.json({ ok: true });
}
