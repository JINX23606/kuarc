// Temporary: show User + Account rows after first Google sign-in.
// Run: npx tsx scripts/user-check.ts — delete after use.
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const prisma = new PrismaClient({ adapter: new PrismaPg(process.env.DATABASE_URL!) });

async function main() {
  const users = await prisma.user.findMany({
    include: { accounts: { select: { provider: true, providerAccountId: true } } },
  });
  for (const u of users) {
    console.log({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      createdAt: u.createdAt,
      accounts: u.accounts,
    });
  }
  console.log("total users:", users.length);
}

main().finally(() => prisma.$disconnect());
