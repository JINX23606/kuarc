// PUBLIC radio list — no login required.
// This is the discovery page for everyone, including external borrowers.
//
// Always render fresh data (radio statuses change often), so opt out of
// static prerendering.

import RadioCard, { type RadioCardData } from "@/components/radios/RadioCard";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// Shown when the database is not reachable yet (before DATABASE_URL is
// configured) so the page is still demonstrable.
const MOCK_RADIOS: RadioCardData[] = [
  { id: "mock-1", code: "R001", model: "ICOM IC-V86", status: "AVAILABLE", note: null },
  { id: "mock-2", code: "R002", model: "YAESU FT-25R", status: "BORROWED", note: null },
  { id: "mock-3", code: "R003", model: "ICOM IC-V86", status: "AVAILABLE", note: "เสาสำรอง 1 ต้น" },
  { id: "mock-4", code: "R004", model: "YAESU FT-65R", status: "MAINTENANCE", note: "ส่งซ่อมลำโพง" },
];

export default async function RadiosPage() {
  let radios: RadioCardData[];
  let usingMockData = false;

  try {
    radios = await prisma.radio.findMany({ orderBy: { code: "asc" } });
  } catch {
    // Database not connected yet — show sample data instead of crashing.
    radios = MOCK_RADIOS;
    usingMockData = true;
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">รายการวิทยุสื่อสาร</h1>
        <p className="mt-2 text-gray-600">
          วิทยุสื่อสารของชมรม KUARC — ดูสถานะได้โดยไม่ต้องเข้าสู่ระบบ
        </p>
      </header>

      {usingMockData && (
        <div className="mb-6 rounded-lg border border-yellow-300 bg-yellow-50 px-4 py-3 text-sm text-yellow-800">
          ⚠️ แสดงข้อมูลตัวอย่าง — ยังไม่ได้เชื่อมต่อฐานข้อมูล (ตั้งค่า DATABASE_URL แล้วรัน
          migration/seed)
        </div>
      )}

      {radios.length === 0 ? (
        <p className="text-gray-500">ยังไม่มีวิทยุในระบบ</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {radios.map((radio) => (
            <RadioCard key={radio.id} radio={radio} />
          ))}
        </div>
      )}
    </main>
  );
}
