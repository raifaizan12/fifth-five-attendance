import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin, requireAnyUser } from "@/lib/apiAuth";
import { logAudit } from "@/lib/audit";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"] as const;
const DAY_ORDER: Record<string, number> = Object.fromEntries(DAYS.map((d, i) => [d, i]));
const TIME_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/;

const schema = z
  .object({
    day: z.enum(DAYS),
    startTime: z.string().regex(TIME_REGEX, "Use 24-hour HH:MM format"),
    endTime: z.string().regex(TIME_REGEX, "Use 24-hour HH:MM format"),
    subjectId: z.string().min(1, "Subject is required"),
    teacherId: z.string().optional(),
    room: z.string().optional(),
    section: z.string().min(1).optional(),
    activeFrom: z.string().optional().nullable(),
    activeUntil: z.string().optional().nullable(),
    locationLat: z.number().min(-90).max(90).optional().nullable(),
    locationLng: z.number().min(-180).max(180).optional().nullable(),
    geofenceRadius: z.number().int().min(20).max(1000).optional(),
  })
  .refine((d) => d.endTime > d.startTime, {
    message: "End time must be after start time",
    path: ["endTime"],
  });

// Any logged-in user (CR or Student) can view the timetable.
export async function GET(req: NextRequest) {
  const { error } = await requireAnyUser();
  if (error) return error;

  const entries = await prisma.timetableEntry.findMany({
    include: { subject: true, teacher: true },
  });

  const activeOnly = new URL(req.url).searchParams.get("activeOnly") === "true";
  if (activeOnly) {
    const now = new Date();
    entries.splice(0, entries.length, ...entries.filter((entry) => (!entry.activeFrom || entry.activeFrom <= now) && (!entry.activeUntil || entry.activeUntil >= now)));
  }

  // Sort by weekday order, then by start time — Prisma can't order by a
  // custom string->weekday mapping directly, so we sort in JS instead.
  entries.sort((a, b) => {
    const dayDiff = (DAY_ORDER[a.day] ?? 99) - (DAY_ORDER[b.day] ?? 99);
    if (dayDiff !== 0) return dayDiff;
    return a.startTime.localeCompare(b.startTime);
  });

  return NextResponse.json({ entries });
}

// Only the CR/Admin can add timetable entries.
export async function POST(req: NextRequest) {
  const { session, error } = await requireAdmin();
  if (error) return error;

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
  }
  const data = parsed.data;

  const entry = await prisma.timetableEntry.create({
    data: {
      day: data.day,
      startTime: data.startTime,
      endTime: data.endTime,
      subjectId: data.subjectId,
      teacherId: data.teacherId || undefined,
      room: data.room || undefined,
      section: data.section || undefined,
      activeFrom: data.activeFrom ? new Date(data.activeFrom) : undefined,
      activeUntil: data.activeUntil ? new Date(data.activeUntil) : undefined,
      locationLat: data.locationLat ?? undefined,
      locationLng: data.locationLng ?? undefined,
      geofenceRadius: data.geofenceRadius ?? 100,
    },
    include: { subject: true, teacher: true },
  });

  await logAudit({
    userId: session!.user.id,
    action: "TIMETABLE_ENTRY_ADDED",
    affectedType: "TimetableEntry",
    affectedId: entry.id,
    details: `${entry.day} ${entry.startTime}-${entry.endTime}: ${entry.subject.name}`,
  });

  return NextResponse.json({ entry }, { status: 201 });
}
