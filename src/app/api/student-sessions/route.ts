import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if ((session?.user as any)?.role !== "ADMIN") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const activeSince = new Date(Date.now() - 2 * 60 * 1000);
  const sessions = await prisma.loginSession.findMany({
    where: { logoutAt: null, lastActive: { gte: activeSince }, user: { role: "STUDENT" } },
    include: { user: { include: { student: true } } },
    orderBy: { lastActive: "desc" },
  });
  return NextResponse.json({ sessions: sessions.map((item) => ({
    id: item.id, name: item.user.student?.fullName ?? "Student",
    iubId: item.user.student?.iubId ?? item.user.loginId ?? "—",
    loginAt: item.loginAt, lastActive: item.lastActive,
  })) });
}

export async function POST(_req: NextRequest) {
  const session = await getServerSession(authOptions);
  const user = session?.user as any;
  if (!user?.id || user.role !== "STUDENT") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const active = await prisma.loginSession.findFirst({ where: { userId: user.id, logoutAt: null }, orderBy: { loginAt: "desc" } });
  if (active) await prisma.loginSession.update({ where: { id: active.id }, data: { lastActive: new Date() } });
  return NextResponse.json({ ok: true });
}
