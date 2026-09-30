import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function MaintenancePage() {
  const settings = await prisma.settings.findUnique({ where: { id: 1 } });
  if (!settings?.maintenanceMode) redirect("/login");
  return <main style={{minHeight:"100vh",display:"grid",placeItems:"center",padding:24,background:"#f5f7fb"}}>
    <section style={{maxWidth:520,width:"100%",background:"white",padding:36,borderRadius:20,textAlign:"center",boxShadow:"0 12px 40px #17255412"}}>
      <div style={{fontSize:42,marginBottom:12}}>🛠️</div><h1 style={{fontSize:28,margin:"0 0 12px"}}>Portal Under Maintenance</h1>
      <p style={{color:"#64748b",lineHeight:1.7}}>{settings?.maintenanceMessage || "The student portal is temporarily unavailable. Please check back soon."}</p>
      <p style={{fontSize:13,lineHeight:1.8,margin:"24px 0 0",color:"#475569"}}>
        Regards,<br /><strong>Roy Faizan</strong><br />
        © 2026 All rights reserved.<br />
        Developed by <strong>Faizan Technologies</strong>
      </p>
      <Link href="/login" style={{display:"inline-block",marginTop:18,color:"#4f46e5",fontWeight:600}}>Back to Login</Link>
    </section></main>;
}
