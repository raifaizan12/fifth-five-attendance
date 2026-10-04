import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/apiAuth";
import { logAudit } from "@/lib/audit";

const schema = z.object({
  subjectId: z.string().min(1),
  topic: z.string().max(120).optional(),
  durationSeconds: z.number().int().min(60).max(300).default(120),
});

export async function POST(req: NextRequest) {
  const { session: authSession, error } = await requireAdmin();
  if (error) return error;

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid QR session settings" }, { status: 400 });

  const subject = await prisma.subject.findUnique({ where: { id: parsed.data.subjectId } });
  if (!subject) return NextResponse.json({ error: "Subject not found" }, { status: 404 });

  const now = new Date();
  const expiresAt = new Date(now.getTime() + parsed.data.durationSeconds * 1000);
  const token = randomUUID().replaceAll("-", "");
  const topic = parsed.data.topic?.trim() || "QR Attendance";

  const created = await prisma.attendanceSession.create({
    data: {
      subjectId: subject.id,
      date: now,
      topic: `${topic} · ${now.toISOString().slice(11, 19)}`,
      createdBy: authSession!.user.id,
      qrToken: token,
      qrExpiresAt: expiresAt,
    },
  });

  await logAudit({
    userId: authSession!.user.id,
    action: "QR_ATTENDANCE_STARTED",
    affectedType: "AttendanceSession",
    affectedId: created.id,
    details: `Started QR attendance for ${subject.name}`,
  });

  const base = new URL(req.url).origin;
  return NextResponse.json({
    session: {
      id: created.id,
      subject: subject.name,
      topic,
      expiresAt: expiresAt.toISOString(),
      token,
      scanUrl: `${base}/portal/scan?token=${encodeURIComponent(token)}`,
    },
  }, { status: 201 });
}
