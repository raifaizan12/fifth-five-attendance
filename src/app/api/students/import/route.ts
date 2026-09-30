import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/apiAuth";
import { logAudit } from "@/lib/audit";
import { parseCsv } from "@/lib/csv";

type CsvRow = {
  Name?: string;
  "IUB ID"?: string;
  "Registration Number"?: string;
  Semester?: string;
  Section?: string;
  Email?: string;
  Phone?: string;
};

export async function POST(req: NextRequest) {
  const { session, error } = await requireAdmin();
  if (error) return error;

  const body = await req.json().catch(() => null);
  if (!body?.csvText) {
    return NextResponse.json({ error: "Missing csvText" }, { status: 400 });
  }

  const rows = parseCsv<CsvRow>(body.csvText);

  const successful: string[] = [];
  const duplicates: string[] = [];
  const invalid: { row: number; reason: string }[] = [];

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const fullName = (r.Name || "").trim();
    const iubId = (r["IUB ID"] || "").trim();
    const regNumber = (r["Registration Number"] || "").trim();
    const semester = (r.Semester || "").trim();
    const section = (r.Section || "Fifth Five").trim();
    const email = (r.Email || "").trim();
    const phone = (r.Phone || "").trim();

    if (!fullName || !iubId || !regNumber || !semester) {
      invalid.push({ row: i + 2, reason: "Missing required field (Name, IUB ID, Registration Number, or Semester)" });
      continue;
    }

    const existing = await prisma.student.findFirst({
      where: { OR: [{ iubId }, { regNumber }] },
    });
    if (existing) {
      duplicates.push(`${fullName} (${iubId})`);
      continue;
    }

    try {
      const passwordHash = await bcrypt.hash(regNumber, 12);
      await prisma.student.create({
        data: {
          fullName,
          iubId,
          regNumber,
          semester,
          section,
          email: email || undefined,
          phone: phone || undefined,
          user: { create: { role: "STUDENT", loginId: iubId, passwordHash } },
        },
      });
      successful.push(`${fullName} (${iubId})`);
    } catch (e: any) {
      invalid.push({ row: i + 2, reason: "Database error: " + (e.message || "unknown") });
    }
  }

  await logAudit({
    userId: session!.user.id,
    action: "STUDENTS_IMPORTED",
    affectedType: "Student",
    details: `CSV import: ${successful.length} added, ${duplicates.length} duplicates, ${invalid.length} invalid`,
  });

  return NextResponse.json({ successful, duplicates, invalid, totalRows: rows.length });
}
