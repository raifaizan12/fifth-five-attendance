import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin, requireAnyUser } from "@/lib/apiAuth";
import { logAudit } from "@/lib/audit";

const schema = z.object({
  className: z.string().min(1).optional(),
  university: z.string().min(1).optional(),
  program: z.string().min(1).optional(),
  semester: z.string().optional(),
  academicYear: z.string().optional(),
  attendanceThreshold: z.number().min(1).max(100).optional(),
  portalLogoUrl: z.string().max(900000).optional().nullable(),
});

export async function GET() {
  const { error } = await requireAnyUser();
  if (error) return error;
  const settings = await prisma.settings.upsert({ where: { id: 1 }, update: {}, create: { id: 1 } });
  return NextResponse.json({ settings });
}

export async function PUT(req: NextRequest) {
  const { session, error } = await requireAdmin();
  if (error) return error;
  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const settings = await prisma.settings.update({ where: { id: 1 }, data: parsed.data });
  await logAudit({ userId: session!.user.id, action: "SETTINGS_UPDATED", affectedType: "Settings", details: JSON.stringify(parsed.data) });
  return NextResponse.json({ settings });
}