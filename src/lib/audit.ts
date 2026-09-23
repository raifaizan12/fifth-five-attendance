import { prisma } from "@/lib/prisma";

export async function logAudit(params: {
  userId?: string;
  action: string;
  affectedType: string;
  affectedId?: string;
  details?: string;
}) {
  try {
    await prisma.auditLog.create({
      data: {
        userId: params.userId,
        action: params.action,
        affectedType: params.affectedType,
        affectedId: params.affectedId,
        details: params.details,
      },
    });
  } catch (err) {
    // Auditing must never break the main operation.
    console.error("Failed to write audit log:", err);
  }
}
