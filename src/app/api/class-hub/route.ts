import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, requireAnyUser, requireStudent } from "@/lib/apiAuth";

const TYPES = ["announcements", "assignments", "exams", "materials", "polls"] as const;
type Type = typeof TYPES[number];

function typeOf(req: NextRequest): Type | null {
  const t = req.nextUrl.searchParams.get("type") as Type | null;
  return t && TYPES.includes(t) ? t : null;
}

export async function GET(req: NextRequest) {
  const { session, error } = await requireAnyUser();
  if (error) return error;
  const type = typeOf(req);
  if (!type) return NextResponse.json({ error: "Invalid type" }, { status: 400 });
  if (type === "announcements") return NextResponse.json({ items: await prisma.announcement.findMany({ orderBy: [{ pinned: "desc" }, { createdAt: "desc" }] }) });
  if (type === "assignments") return NextResponse.json({ items: await prisma.assignment.findMany({ orderBy: { dueDate: "asc" } }) });
  if (type === "exams") return NextResponse.json({ items: await prisma.examEvent.findMany({ orderBy: { date: "asc" } }) });
  if (type === "materials") return NextResponse.json({ items: await prisma.studyMaterial.findMany({ orderBy: { createdAt: "desc" } }) });
  const polls = await prisma.classPoll.findMany({
    include: { votes: { include: { student: { select: { fullName: true, iubId: true, regNumber: true } } }, orderBy: { createdAt: "desc" } } },
    orderBy: { createdAt: "desc" },
  });
  const isAdmin = session!.user.role === "ADMIN";
  const studentId = session!.user.studentId;
  return NextResponse.json({ items: polls.map(p => ({
    ...p,
    options: JSON.parse(p.options),
    voteCount: p.votes.length,
    myVote: !isAdmin && studentId ? (p.votes.find(v => v.studentId === studentId)?.option || null) : undefined,
    votes: isAdmin ? p.votes.map(v => ({ id: v.id, option: v.option, createdAt: v.createdAt, student: v.student })) : undefined,
  })) });
}

export async function POST(req: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return error;
  const type = typeOf(req);
  if (!type) return NextResponse.json({ error: "Invalid type" }, { status: 400 });
  const b = await req.json();
  let item;
  if (type === "announcements") item = await prisma.announcement.create({ data: { title: String(b.title || ""), body: String(b.body || ""), priority: b.priority || "NORMAL", pinned: !!b.pinned } });
  if (type === "assignments") item = await prisma.assignment.create({ data: { title: String(b.title || ""), description: b.description || null, subject: b.subject || null, dueDate: new Date(b.dueDate) } });
  if (type === "exams") item = await prisma.examEvent.create({ data: { title: String(b.title || ""), subject: String(b.subject || ""), date: new Date(b.date), startTime: b.startTime || null, room: b.room || null, kind: b.kind || "EXAM" } });
  if (type === "materials") item = await prisma.studyMaterial.create({ data: { title: String(b.title || ""), subject: b.subject || null, url: String(b.url || ""), description: b.description || null } });
  if (type === "polls") {
    const options = Array.isArray(b.options) ? b.options.map(String).filter(Boolean) : String(b.options || "").split("|").map((x: string) => x.trim()).filter(Boolean);
    if (!b.question || options.length < 2) return NextResponse.json({ error: "Poll needs a question and at least 2 options" }, { status: 400 });
    item = await prisma.classPoll.create({ data: { question: String(b.question), options: JSON.stringify(options), active: b.active !== false } });
  }
  return NextResponse.json({ item }, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return error;
  const type = typeOf(req); const id = req.nextUrl.searchParams.get("id");
  if (!type || !id) return NextResponse.json({ error: "type and id are required" }, { status: 400 });
  if (type === "announcements") await prisma.announcement.delete({ where: { id } });
  if (type === "assignments") await prisma.assignment.delete({ where: { id } });
  if (type === "exams") await prisma.examEvent.delete({ where: { id } });
  if (type === "materials") await prisma.studyMaterial.delete({ where: { id } });
  if (type === "polls") await prisma.classPoll.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

export async function PATCH(req: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return error;
  const type = typeOf(req); const id = req.nextUrl.searchParams.get("id"); const b = await req.json();
  if (!type || !id) return NextResponse.json({ error: "type and id are required" }, { status: 400 });
  if (type === "announcements") return NextResponse.json({ item: await prisma.announcement.update({ where: { id }, data: { pinned: !!b.pinned } }) });
  if (type === "polls") return NextResponse.json({ item: await prisma.classPoll.update({ where: { id }, data: { active: !!b.active } }) });
  return NextResponse.json({ error: "Only pinning announcements and toggling polls are supported here" }, { status: 400 });
}

export async function PUT(req: NextRequest) {
  const { session, error } = await requireStudent();
  if (error) return error;
  const type = typeOf(req); const id = req.nextUrl.searchParams.get("id");
  if (type !== "polls" || !id) return NextResponse.json({ error: "Invalid poll" }, { status: 400 });
  const b = await req.json();
  const poll = await prisma.classPoll.findUnique({ where: { id } });
  if (!poll || !poll.active) return NextResponse.json({ error: "Poll is closed" }, { status: 400 });
  const studentId = session!.user.studentId;
  if (!studentId) return NextResponse.json({ error: "Student profile not found" }, { status: 400 });
  const options: string[] = JSON.parse(poll.options);
  if (!options.includes(String(b.option))) return NextResponse.json({ error: "Invalid option" }, { status: 400 });
  const vote = await prisma.pollVote.upsert({ where: { pollId_studentId: { pollId: id, studentId } }, update: { option: String(b.option) }, create: { pollId: id, studentId, option: String(b.option) } });
  return NextResponse.json({ vote });
}
