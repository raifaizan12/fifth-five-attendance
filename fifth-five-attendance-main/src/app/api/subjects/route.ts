import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin, requireAnyUser } from "@/lib/apiAuth";
import { logAudit } from "@/lib/audit";

const schema = z.object({
  name: z.string().min(2),
  code: z.string().optional(),
  semester: z.string().optional(),
  teacherId: z.string().optional(),
});

export async function GET() {
  const { error } = await requireAnyUser();
  if (error) return error;
  const subjects = await prisma.subject.findMany({
    orderBy: { name: "asc" },
    include: { teacher: true },
  });
  return NextResponse.json({ subjects });
}

export async function POST(req: NextRequest) {
  const { session, error } = await requireAdmin();
  if (error) return error;
  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const subject = await prisma.subject.create({
    data: {
      name: parsed.data.name,
      code: parsed.data.code || undefined,
      semester: parsed.data.semester || undefined,
      teacherId: parsed.data.teacherId || undefined,
    },
  });

  await logAudit({ userId: session!.user.id, action: "SUBJECT_ADDED", affectedType: "Subject", affectedId: subject.id, details: subject.name });
  return NextResponse.json({ subject }, { status: 201 });
}
