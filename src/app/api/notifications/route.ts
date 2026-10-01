import { NextRequest, NextResponse } from "next/server";
import { requireStudent } from "@/lib/apiAuth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const { session, error } = await requireStudent();
  if (error) return error;
  const studentId = session!.user.studentId;
  const items = await prisma.notification.findMany({
    where: { studentId },
    orderBy: { createdAt: "desc" },
    take: 30,
  });
  return NextResponse.json({ notifications: items });
}

export async function POST(req: NextRequest) {
  const { session, error } = await requireStudent();
  if (error) return error;
  const body = await req.json().catch(() => ({}));
  if (body.action === "read") {
    const id = String(body.id || "");
    await prisma.notification.updateMany({
      where: { id, studentId: session!.user.studentId },
      data: { read: true },
    });
    return NextResponse.json({ ok: true });
  }
  if (body.action === "read-all") {
    await prisma.notification.updateMany({
      where: { studentId: session!.user.studentId, read: false },
      data: { read: true },
    });
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
