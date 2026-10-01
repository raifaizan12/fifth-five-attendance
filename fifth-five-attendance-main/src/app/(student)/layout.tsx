import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

export const metadata = { manifest: "/manifest.webmanifest", themeColor: "#0b1525" };

export default async function StudentLayout({ children }: { children: React.ReactNode }) {
  const settings = await prisma.settings.findUnique({ where: { id: 1 } });
  if (settings?.maintenanceMode) redirect("/maintenance");
  return <div>{children}</div>;
}
