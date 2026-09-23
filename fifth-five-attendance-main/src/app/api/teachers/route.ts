import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin, requireAnyUser } from "@/lib/apiAuth";
import { logAudit } from "@/lib/audit";

const schema = z.object({
  fullName: z.string().min(2),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
});

export async function GET() {
  const { error } = await requireAnyUser();
  if (error) return error;
  const teachers = await prisma.teacher.findMany({ orderBy: { fullName: "asc" } });
  return NextResponse.json({ teachers });
}

export async function POST(req: NextRequest) {
  const { session, error } = await requireAdmin();
  if (error) return error;
  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const teacher = await prisma.teacher.create({
    data: { fullName: parsed.data.fullName, email: parsed.data.email || undefined, phone: parsed.data.phone || undefined },
  });
  await logAudit({ userId: session!.user.id, action: "TEACHER_ADDED", affectedType: "Teacher", affectedId: teacher.id, details: teacher.fullName });
  return NextResponse.json({ teacher }, { status: 201 });
}
