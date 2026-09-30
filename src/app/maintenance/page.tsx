import { prisma } from "@/lib/prisma";
import Link from "next/link";

export default async function MaintenancePage() {
  const settings = await prisma.settings.findUnique({ where: { id: 1 } });
  return <main style={{minHeight:"100vh",display:"grid",placeItems:"center",padding:24,background:"#f5f7fb"}}>
    <section style={{maxWidth:520,width:"100%",background:"white",padding:36,borderRadius:20,textAlign:"center",boxShadow:"0 12px 40px #17255412"}}>
      <div style={{fontSize:42,marginBottom:12}}>🛠️</div><h1 style={{fontSize:28,margin:"0 0 12px"}}>Portal Under Maintenance</h1>
      <p style={{color:"#64748b",lineHeight:1.7}}>{settings?.maintenanceMessage || "The student portal is temporarily unavailable. Please check back soon."}</p>
      <Link href="/login" style={{display:"inline-block",marginTop:18,color:"#4f46e5",fontWeight:600}}>Back to Login</Link>
    </section></main>;
}
