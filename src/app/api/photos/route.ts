import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin, requireAnyUser } from "@/lib/apiAuth";
import { logAudit } from "@/lib/audit";

// Keep base64 payloads reasonable so the request doesn't hit Vercel's body-size limit.
// Images are resized/compressed in the browser before upload (see the CR upload page).
const MAX_IMAGE_CHARS = 2_000_000; // ~1.5 MB of actual image data

const createSchema = z.object({
  caption: z.string().optional(),
  imageData: z.string().min(1).max(MAX_IMAGE_CHARS, "Image is too large — please use a smaller photo"),
  order: z.number().optional(),
});

const updateSchema = z.object({
  id: z.string().min(1),
  caption: z.string().optional(),
  order: z.number().optional(),
});

// Any logged-in user (CR or Student) can view the photos.
export async function GET() {
  const { error } = await requireAnyUser();
  if (error) return error;

  const photos = await prisma.classPhoto.findMany({
    orderBy: [{ order: "asc" }, { createdAt: "asc" }],
  });

  return NextResponse.json({ photos });
}

// Only the CR/Admin can upload a new photo.
export async function POST(req: NextRequest) {
  const { session, error } = await requireAdmin();
  if (error) return error;

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
  }

  const photo = await prisma.classPhoto.create({
    data: {
      caption: parsed.data.caption || undefined,
      imageData: parsed.data.imageData,
      order: parsed.data.order ?? 0,
    },
  });

  await logAudit({
    userId: session!.user.id,
    action: "CLASS_PHOTO_ADDED",
    affectedType: "ClassPhoto",
    affectedId: photo.id,
    details: parsed.data.caption || "Class photo uploaded",
  });

  // Don't echo the full base64 payload back in the audit-adjacent response either — keep it lean.
  return NextResponse.json({ photo: { ...photo, imageData: undefined } }, { status: 201 });
}

// Edit a caption or reorder a photo. The id is sent in the JSON body, not the URL,
// so this stays a single file with no [id] dynamic-route folder to worry about.
export async function PUT(req: NextRequest) {
  const { session, error } = await requireAdmin();
  if (error) return error;

  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
  }

  const existing = await prisma.classPhoto.findUnique({ where: { id: parsed.data.id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const photo = await prisma.classPhoto.update({
    where: { id: parsed.data.id },
    data: {
      caption: parsed.data.caption,
      order: parsed.data.order,
    },
  });

  await logAudit({
    userId: session!.user.id,
    action: "CLASS_PHOTO_EDITED",
    affectedType: "ClassPhoto",
    affectedId: photo.id,
  });

  return NextResponse.json({ photo: { ...photo, imageData: undefined } });
}

// Delete a photo. The id is passed as a query string (?id=xxx) instead of a
// dynamic [id] route segment — same reasoning as PUT above.
export async function DELETE(req: NextRequest) {
  const { session, error } = await requireAdmin();
  if (error) return error;

  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id query parameter is required" }, { status: 400 });

  const existing = await prisma.classPhoto.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.classPhoto.delete({ where: { id } });

  await logAudit({
    userId: session!.user.id,
    action: "CLASS_PHOTO_DELETED",
    affectedType: "ClassPhoto",
    affectedId: id,
  });

  return NextResponse.json({ ok: true });
}
