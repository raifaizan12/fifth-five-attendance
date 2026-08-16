import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret");
  const expected = process.env.SETUP_SECRET;

  if (!expected) {
    return NextResponse.json({ error: "SETUP_SECRET is not configured on the server." }, { status: 500 });
  }
  if (!secret || secret !== expected) {
    return NextResponse.json({ error: "Invalid or missing secret." }, { status: 401 });
  }

  const email = process.env.SEED_ADMIN_EMAIL;
  const password = process.env.SEED_ADMIN_PASSWORD;
  if (!email || !password) {
    return NextResponse.json({ error: "SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD are not configured." }, { status: 500 });
  }

  const existingAdmin = await prisma.user.findFirst({ where: { role: "ADMIN" } });
  if (existingAdmin) {
    return NextResponse.json({ message: "Setup already completed — a CR/Admin account already exists. No changes made." });
  }

  const passwordHash = await bcrypt.hash(password, 12);
  await prisma.user.create({ data: { role: "ADMIN", email, passwordHash } });

  await prisma.settings.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1 },
  });

  return NextResponse.json({
    message: `Setup complete. You can now log in as Class Representative with email: ${email}`,
  });
}
