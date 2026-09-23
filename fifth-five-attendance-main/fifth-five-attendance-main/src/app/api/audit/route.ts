import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/apiAuth";

export async function GET(req: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const limit = Number(searchParams.get("limit") || 100);

  const logs = await prisma.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
    include: { user: { select: { email: true, loginId: true } } },
  });

  return NextResponse.json({
    logs: logs.map((l) => ({
      id: l.id,
      action: l.action,
      affectedType: l.affectedType,
      affectedId: l.affectedId,
      details: l.details,
      createdAt: l.createdAt,
      actor: l.user?.email || l.user?.loginId || "System",
    })),
  });
}
