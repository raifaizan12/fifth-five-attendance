import type { Viewport } from "next";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import StudentNav from "@/components/StudentNav";

export default async function StudentLayout({ children }: { children: React.ReactNode }) {
  const settings = await prisma.settings.findUnique({ where: { id: 1 } });
  if (settings?.maintenanceMode) redirect("/maintenance");
  return <div><StudentNav />{children}</div>;
}

export const viewport: Viewport = { themeColor: "#07111f" };
