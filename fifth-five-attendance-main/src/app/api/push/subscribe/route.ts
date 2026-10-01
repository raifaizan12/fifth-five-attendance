import { NextRequest, NextResponse } from "next/server";
import { requireStudent } from "@/lib/apiAuth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const { session, error } = await requireStudent();
  if (error) return error;
  const body = await req.json().catch(() => ({}));
  const sub = body?.subscription;
  if (!sub?.endpoint || !sub?.keys?.p256dh || !sub?.keys?.auth) {
    return NextResponse.json({ error: "Invalid push subscription" }, { status: 400 });
  }
  await prisma.pushSubscription.upsert({
    where: { endpoint: String(sub.endpoint) },
    update: { p256dh: String(sub.keys.p256dh), auth: String(sub.keys.auth), userId: session!.user.id },
    create: { endpoint: String(sub.endpoint), p256dh: String(sub.keys.p256dh), auth: String(sub.keys.auth), userId: session!.user.id },
  });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const { session, error } = await requireStudent();
  if (error) return error;
  const body = await req.json().catch(() => ({}));
  if (typeof body.endpoint !== "string") return NextResponse.json({ error: "Endpoint is required" }, { status: 400 });
  await prisma.pushSubscription.deleteMany({ where: { endpoint: body.endpoint, userId: session!.user.id } });
  return NextResponse.json({ ok: true });
}
