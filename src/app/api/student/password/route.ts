import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireStudent } from "@/lib/apiAuth";
import { logAudit } from "@/lib/audit";

const passwordSchema = z.object({
  currentPassword: z.string().min(1, "Enter your current password"),
  newPassword: z.string().min(8, "Use at least 8 characters").max(128),
  confirmPassword: z.string().min(1),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "New passwords do not match",
  path: ["confirmPassword"],
}).refine((data) => data.newPassword !== data.currentPassword, {
  message: "Choose a password different from your current password",
  path: ["newPassword"],
});

export async function POST(req: NextRequest) {
  const { session, error } = await requireStudent();
  if (error) return error;

  const body = await req.json().catch(() => null);
  const parsed = passwordSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid password details" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { id: session!.user.id } });
  if (!user || user.role !== "STUDENT" || !user.isActive) {
    return NextResponse.json({ error: "Student account not found or inactive" }, { status: 403 });
  }

  const currentMatches = await bcrypt.compare(parsed.data.currentPassword, user.passwordHash);
  if (!currentMatches) {
    return NextResponse.json({ error: "Your current password is incorrect" }, { status: 400 });
  }

  const passwordHash = await bcrypt.hash(parsed.data.newPassword, 12);
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash } });
  await logAudit({
    userId: user.id,
    action: "STUDENT_PASSWORD_CHANGED",
    affectedType: "User",
    affectedId: user.id,
    details: "Student changed their account password.",
  });

  return NextResponse.json({ success: true, message: "Password updated successfully." });
}
