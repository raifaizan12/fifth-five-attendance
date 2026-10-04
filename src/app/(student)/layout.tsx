import type { Viewport } from "next";
import { prisma } from "@/lib/prisma";
import StudentNav from "@/components/StudentNav";

export default async function StudentLayout({ children }: { children: React.ReactNode }) {
  const settings = await prisma.settings.findUnique({ where: { id: 1 } });
  return <div><StudentNav settings={settings ? { portalLogoUrl: settings.portalLogoUrl, className: settings.className, university: settings.university, program: settings.program, semester: settings.semester } : null} />{children}</div>;
}

export const viewport: Viewport = { themeColor: "#07111f" };
