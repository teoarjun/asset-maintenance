import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const password = await bcrypt.hash("password123", 10);

  const users = [
    { email: "user@demo.com", name: "Demo User", role: "USER" as const },
    { email: "manager@demo.com", name: "Demo Manager", role: "MANAGER" as const },
    { email: "tech@demo.com", name: "Demo Technician", role: "TECHNICIAN" as const },
  ];

  for (const u of users) {
    await prisma.user.upsert({
      where: { email: u.email },
      update: { passwordHash: password, name: u.name, role: u.role },
      create: {
        email: u.email,
        passwordHash: password,
        name: u.name,
        role: u.role,
      },
    });
  }

  console.log("Seed: demo users ready (password: password123)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
