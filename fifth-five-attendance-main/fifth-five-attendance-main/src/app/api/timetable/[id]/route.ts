import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/apiAuth";
import { logAudit } from "@/lib/audit";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"] as const;
const TIME_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/;

const schema = z.object({
  day: z.enum(DAYS).optional(),
  startTime: z.string().regex(TIME_REGEX, "Use 24-hour HH:MM format").optional(),
  endTime: z.string().regex(TIME_REGEX, "Use 24-hour HH:MM format").optional(),
  subjectId: z.string().min(1).optional(),
  teacherId: z.string().nullable().optional(),
  room: z.string().nullable().optional(),
  section: z.string().optional(),
});

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const { session, error } = await requireAdmin();
  if (error) return error;

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
  }

  const existing = await prisma.timetableEntry.findUnique({ where: { id: params.id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const nextStart = parsed.data.startTime ?? existing.startTime;
  const nextEnd = parsed.data.endTime ?? existing.endTime;
  if (nextEnd <= nextStart) {
    return NextResponse.json({ error: "End time must be after start time" }, { status: 400 });
  }

  const entry = await prisma.timetableEntry.update({
    where: { id: params.id },
    data: parsed.data as any,
    include: { subject: true, teacher: true },
  });

  await logAudit({
    userId: session!.user.id,
    action: "TIMETABLE_ENTRY_EDITED",
    affectedType: "TimetableEntry",
    affectedId: entry.id,
    details: `${entry.day} ${entry.startTime}-${entry.endTime}: ${entry.subject.name}`,
  });

  return NextResponse.json({ entry });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const { session, error } = await requireAdmin();
  if (error) return error;

  const existing = await prisma.timetableEntry.findUnique({ where: { id: params.id }, include: { subject: true } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.timetableEntry.delete({ where: { id: params.id } });

  await logAudit({
    userId: session!.user.id,
    action: "TIMETABLE_ENTRY_DELETED",
    affectedType: "TimetableEntry",
    affectedId: params.id,
    details: `${existing.day} ${existing.startTime}-${existing.endTime}: ${existing.subject.name}`,
  });

  return NextResponse.json({ ok: true });
}
