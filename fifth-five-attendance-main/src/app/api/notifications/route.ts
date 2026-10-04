import { NextRequest, NextResponse } from "next/server";
import { requireStudent } from "@/lib/apiAuth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const { session, error } = await requireStudent();
  if (error) return error;

  const studentId = session!.user.studentId;
  if (!studentId) return NextResponse.json({ items: [], unread: 0 });

  const items = await prisma.notification.findMany({
    where: { studentId },
    orderBy: { createdAt: "desc" },
    take: 30,
  });

  return NextResponse.json({
    items,
    unread: items.filter((x) => !x.read).length,
  });
}

export async function PATCH(req: NextRequest) {
  const { session, error } = await requireStudent();
  if (error) return error;

  const studentId = session!.user.studentId;
  if (!studentId) return NextResponse.json({ ok: true });

  const body = await req.json().catch(() => ({}));

  if (body.all === true) {
    await prisma.notification.updateMany({
      where: { studentId, read: false },
      data: { read: true },
    });
    return NextResponse.json({ ok: true });
  }

  if (typeof body.id !== "string") {
    return NextResponse.json(
      { error: "Notification id is required" },
      { status: 400 }
    );
  }

  await prisma.notification.updateMany({
    where: {
      id: body.id,
      studentId,
    },
    data: { read: true },
  });

  return NextResponse.json({ ok: true });
}
