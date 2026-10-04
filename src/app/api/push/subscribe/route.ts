import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
export async function POST(req:NextRequest){ const s:any=await getServerSession(authOptions); if(!s?.user?.id)return NextResponse.json({error:"Unauthorized"},{status:401}); const b=await req.json(); if(!b?.endpoint||!b?.keys?.p256dh||!b?.keys?.auth)return NextResponse.json({error:"Invalid subscription"},{status:400}); const sub=await prisma.pushSubscription.upsert({where:{userId_endpoint:{userId:s.user.id,endpoint:b.endpoint}},update:{p256dh:b.keys.p256dh,auth:b.keys.auth},create:{userId:s.user.id,endpoint:b.endpoint,p256dh:b.keys.p256dh,auth:b.keys.auth}}); return NextResponse.json({ok:true,id:sub.id}); }
