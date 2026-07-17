// Seed script — fills the database with a few sample radios.
// Run with: npx prisma db seed   (configured in prisma.config.ts)
//
// Uses upsert on the unique `code`, so running it repeatedly is safe.

import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg(process.env.DATABASE_URL!);
const prisma = new PrismaClient({ adapter });

const RADIOS = [
  { code: "R001", model: "ICOM IC-V86", status: "AVAILABLE", note: null },
  { code: "R002", model: "ICOM IC-V86", status: "AVAILABLE", note: null },
  { code: "R003", model: "YAESU FT-25R", status: "AVAILABLE", note: "เสาสำรอง 1 ต้น" },
  { code: "R004", model: "YAESU FT-65R", status: "MAINTENANCE", note: "ส่งซ่อมลำโพง" },
  { code: "R005", model: null, status: "AVAILABLE", note: "ไม่ทราบรุ่น รอตรวจสอบ" },
] as const;

async function main() {
  for (const radio of RADIOS) {
    await prisma.radio.upsert({
      where: { code: radio.code },
      update: {}, // already exists — leave it alone
      create: { ...radio },
    });
  }
  console.log(`Seeded ${RADIOS.length} radios.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
