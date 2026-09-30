import { prisma } from "@/lib/prisma";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function MaintenancePage() {
  const settings = await prisma.settings.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1 },
  });

  const message = settings.maintenanceMessage?.trim() ||
    "The student portal is temporarily unavailable. Please check back soon.";

  return (
    <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24, background: "#f5f7fb" }}>
      <section role="status" aria-live="polite" style={{ maxWidth: 520, width: "100%", background: "white", padding: 36, borderRadius: 20, textAlign: "center", boxShadow: "0 12px 40px #17255412" }}>
        <div aria-hidden="true" style={{ fontSize: 42, marginBottom: 12 }}>🛠️</div>
        <h1 style={{ fontSize: 28, margin: "0 0 12px", color: "#172554" }}>Portal Under Maintenance</h1>
        <p style={{ color: "#475569", lineHeight: 1.7, whiteSpace: "pre-wrap", overflowWrap: "anywhere", margin: 0 }}>{message}</p>
        <p style={{ color: "#64748b", fontSize: 13, marginTop: 18 }}>Please try again later or contact your Class Representative.</p>
        <Link href="/login" style={{ display: "inline-block", marginTop: 18, color: "#4f46e5", fontWeight: 600 }}>Back to Login</Link>
      </section>
    </main>
  );
}
