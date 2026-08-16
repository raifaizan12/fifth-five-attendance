import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/apiAuth";
import { logAudit } from "@/lib/audit";

const schema = z.object({
  name: z.string().min(2).optional(),
  code: z.string().optional(),
  semester: z.string().optional(),
  teacherId: z.string().nullable().optional(),
});

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const { session, error } = await requireAdmin();
  if (error) return error;
  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const subject = await prisma.subject.update({ where: { id: params.id }, data: parsed.data as any });
  await logAudit({ userId: session!.user.id, action: "SUBJECT_EDITED", affectedType: "Subject", affectedId: subject.id, details: subject.name });
  return NextResponse.json({ subject });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const { session, error } = await requireAdmin();
  if (error) return error;
  const subject = await prisma.subject.findUnique({ where: { id: params.id } });
  if (!subject) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.subject.delete({ where: { id: params.id } });
  await logAudit({ userId: session!.user.id, action: "SUBJECT_DELETED", affectedType: "Subject", affectedId: params.id, details: subject.name });
  return NextResponse.json({ ok: true });
}
