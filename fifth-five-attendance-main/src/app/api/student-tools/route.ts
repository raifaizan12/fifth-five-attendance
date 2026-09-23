import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireStudent, requireAnyUser } from "@/lib/apiAuth";

export async function GET() {
  const { session, error } = await requireAnyUser();
  if (error) return error;
  if (session!.user.role === "ADMIN") {
    const [posts, issues] = await Promise.all([
      prisma.discussionPost.findMany({ orderBy: { createdAt: "desc" }, take: 50, include: { student: { select: { fullName: true, iubId: true } } } }),
      prisma.studentIssue.findMany({ orderBy: { createdAt: "desc" }, take: 50, include: { student: { select: { fullName: true, iubId: true } } } }),
    ]);
    return NextResponse.json({ posts, issues });
  }
  const studentId = session!.user.studentId;
  if (!studentId) return NextResponse.json({ error: "Student profile not found" }, { status: 400 });
  const [posts, issues] = await Promise.all([
    prisma.discussionPost.findMany({ orderBy: { createdAt: "desc" }, take: 30, include: { student: { select: { fullName: true, iubId: true } } } }),
    prisma.studentIssue.findMany({ where: { studentId }, orderBy: { createdAt: "desc" }, take: 20 }),
  ]);
  return NextResponse.json({ posts, issues });
}

export async function POST(req: NextRequest) {
  const { session, error } = await requireStudent();
  if (error) return error;
  const studentId = session!.user.studentId;
  if (!studentId) return NextResponse.json({ error: "Student profile not found" }, { status: 400 });
  const body = await req.json();
  const type = String(body.type || "");
  const message = String(body.message || "").trim();
  if (!message || message.length > 1000) return NextResponse.json({ error: "Message is required and must be under 1000 characters" }, { status: 400 });
  if (type === "discussion") {
    const post = await prisma.discussionPost.create({ data: { message, studentId }, include: { student: { select: { fullName: true, iubId: true } } } });
    return NextResponse.json({ post }, { status: 201 });
  }
  if (type === "issue") {
    const allowed = ["Attendance", "Timetable", "Assignment", "Technical", "Other"];
    const category = allowed.includes(String(body.category)) ? String(body.category) : "Other";
    const item = await prisma.studentIssue.create({ data: { category, message, studentId } });
    return NextResponse.json({ issue: item }, { status: 201 });
  }
  return NextResponse.json({ error: "Invalid request type" }, { status: 400 });
}


export async function PATCH(req: NextRequest) {
  const auth = await requireAnyUser();
  if (auth.error) return auth.error;
  if (auth.session?.user.role !== "ADMIN") return NextResponse.json({ error: "Admin only" }, { status: 403 });
  const body = await req.json();
  const type = String(body.type || "");
  const id = String(body.id || "");
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });
  if (type === "issue") {
    const status = ["OPEN", "IN_PROGRESS", "RESOLVED"].includes(String(body.status)) ? String(body.status) : "OPEN";
    return NextResponse.json({ issue: await prisma.studentIssue.update({ where: { id }, data: { status } }) });
  }
  return NextResponse.json({ error: "Unsupported item" }, { status: 400 });
}

export async function DELETE(req: NextRequest) {
  const auth = await requireAnyUser();
  if (auth.error) return auth.error;
  if (auth.session?.user.role !== "ADMIN") return NextResponse.json({ error: "Admin only" }, { status: 403 });
  const type = req.nextUrl.searchParams.get("type");
  const id = req.nextUrl.searchParams.get("id");
  if (!type || !id) return NextResponse.json({ error: "type and id are required" }, { status: 400 });
  if (type === "issue") await prisma.studentIssue.delete({ where: { id } });
  else if (type === "discussion") await prisma.discussionPost.delete({ where: { id } });
  else return NextResponse.json({ error: "Unsupported item" }, { status: 400 });
  return NextResponse.json({ ok: true });
}
