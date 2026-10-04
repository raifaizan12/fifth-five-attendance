import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
 const session:any = await getServerSession(authOptions); if (!session?.user?.id) return NextResponse.json({error:"Unauthorized"},{status:401});
 const notifications=await prisma.notification.findMany({where:{userId:session.user.id},orderBy:{createdAt:"desc"},take:50});
 return NextResponse.json({notifications, unread:notifications.filter(n=>!n.readAt).length});
}
export async function PATCH(req:NextRequest){
 const session:any=await getServerSession(authOptions); if(!session?.user?.id)return NextResponse.json({error:"Unauthorized"},{status:401});
 const body=await req.json().catch(()=>({}));
 if(body.all) await prisma.notification.updateMany({where:{userId:session.user.id,readAt:null},data:{readAt:new Date()}});
 else if(body.id) await prisma.notification.updateMany({where:{id:String(body.id),userId:session.user.id},data:{readAt:new Date()}});
 return NextResponse.json({ok:true});
}
