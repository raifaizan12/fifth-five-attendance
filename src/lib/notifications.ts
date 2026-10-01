import { prisma } from "@/lib/prisma";

export async function createStudentNotifications(input: {
  studentIds?: string[];
  title: string;
  body: string;
  kind: string;
}) {
  const students = input.studentIds?.length
    ? await prisma.student.findMany({ where: { id: { in: input.studentIds }, isActive: true }, select: { id: true } })
    : await prisma.student.findMany({ where: { isActive: true }, select: { id: true } });

  if (!students.length) return 0;
  await prisma.notification.createMany({
    data: students.map((s) => ({
      studentId: s.id,
      title: input.title,
      body: input.body,
      kind: input.kind,
    })),
  });
  return students.length;
}
