import { NextRequest, NextResponse } from "next/server";
import { requireStudent } from "@/lib/apiAuth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const { session, error } = await requireStudent();
  if (error) return error;
  const items = await prisma.notification.findMany({
    where: { userId: session!.user.id },
    orderBy: { createdAt: "desc" },
    take: 30,
  });
  return NextResponse.json({ items, unread: items.filter((x) => !x.readAt).length });
}

export async function PATCH(req: NextRequest) {
  const { session, error } = await requireStudent();
  if (error) return error;
  const body = await req.json().catch(() => ({}));
  if (body.all === true) {
    await prisma.notification.updateMany({ where: { userId: session!.user.id, readAt: null }, data: { readAt: new Date() } });
    return NextResponse.json({ ok: true });
  }
  if (typeof body.id !== "string") return NextResponse.json({ error: "Notification id is required" }, { status: 400 });
  await prisma.notification.updateMany({ where: { id: body.id, userId: session!.user.id }, data: { readAt: new Date() } });
  return NextResponse.json({ ok: true });
}
