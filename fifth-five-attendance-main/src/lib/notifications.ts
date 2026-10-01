import { prisma } from "@/lib/prisma";

export async function createStudentNotifications(args: {
  students: Array<{ id: string; user?: { id: string } | null }>;
  title: string;
  bodyForStudent: (student: { id: string; user?: { id: string } | null }) => string;
  icon?: string;
  kind?: string;
}) {
  const { students, title, bodyForStudent, icon = "🔔", kind = "GENERAL" } = args;
  const rows = students
    .filter((s) => s.user?.id)
    .map((s) => ({ userId: s.user!.id, studentId: s.id, title, body: bodyForStudent(s), icon, kind }));
  if (!rows.length) return 0;
  await prisma.notification.createMany({ data: rows });
  return rows.length;
}
