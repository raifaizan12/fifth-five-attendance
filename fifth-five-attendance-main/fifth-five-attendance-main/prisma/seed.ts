import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const email = process.env.SEED_ADMIN_EMAIL || "cr@fifthfive.iub.edu.pk";
  const password = process.env.SEED_ADMIN_PASSWORD || "ChangeThisPassword123!";

  const existing = await prisma.user.findUnique({ where: { email } });
  if (!existing) {
    const passwordHash = await bcrypt.hash(password, 12);
    await prisma.user.create({
      data: { role: "ADMIN", email, passwordHash },
    });
    console.log(`Created CR/Admin account: ${email}`);
  } else {
    console.log("Admin account already exists, skipping.");
  }

  await prisma.settings.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      className: "Fifth Five",
      university: "The Islamia University of Bahawalpur",
      program: "BS Information Technology",
      semester: "5th Semester",
      academicYear: "2025-2026",
      attendanceThreshold: 75,
    },
  });
  console.log("Default settings ensured.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
