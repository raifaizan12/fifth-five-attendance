import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/apiAuth";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const { error } = await requireAdmin();
  if (error) return error;
  const session = await prisma.attendanceSession.findUnique({
    where: { id: params.id },
    include: { subject: true, records: { select: { status: true } } },
  });
  if (!session) return NextResponse.json({ error: "QR session not found" }, { status: 404 });
  return NextResponse.json({
    session: {
      id: session.id,
      subject: session.subject.name,
      expiresAt: session.qrExpiresAt?.toISOString() ?? null,
      active: !!session.qrToken && !!session.qrExpiresAt && session.qrExpiresAt.getTime() > Date.now(),
      present: session.records.filter((r) => r.status === "PRESENT").length,
      late: session.records.filter((r) => r.status === "LATE").length,
      total: session.records.length,
    },
  });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const { error } = await requireAdmin();
  if (error) return error;
  const session = await prisma.attendanceSession.findUnique({ where: { id: params.id } });
  if (!session) return NextResponse.json({ error: "QR session not found" }, { status: 404 });
  await prisma.attendanceSession.update({ where: { id: params.id }, data: { qrToken: null, qrExpiresAt: new Date() } });
  return NextResponse.json({ success: true });
}
