import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

export default async function StudentLayout({ children }: { children: React.ReactNode }) {
  const settings = await prisma.settings.findUnique({ where: { id: 1 } });
  if (settings?.maintenanceMode) redirect("/maintenance");
  return <div>{children}</div>;
}
