// PUBLIC external borrower form — no account needed.
// Other clubs / outside individuals request a radio here; the request goes
// into the same admin approval queue as member requests.
//
// Next.js 16: `searchParams` is a Promise — await it.

import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { createExternalRequest } from "./actions";

export const dynamic = "force-dynamic";

const ERROR_MESSAGES: Record<string, string> = {
  invalid: "ข้อมูลไม่ครบถ้วน กรุณากรอกให้ครบทุกช่อง",
  "past-due": "กำหนดคืนต้องเป็นวันนี้หรือหลังจากนี้",
  "not-available": "วิทยุที่เลือกไม่พร้อมให้ยืมแล้ว กรุณาเลือกเครื่องอื่น",
};

export default async function BorrowRequestPage({
  searchParams,
}: {
  searchParams: Promise<{ radio?: string; error?: string; success?: string }>;
}) {
  const { radio: preselectedRadioId, error, success } = await searchParams;

  // Success state — show confirmation instead of the form.
  if (success) {
    return (
      <main className="mx-auto w-full max-w-lg px-4 py-16 text-center">
        <div className="rounded-xl border border-green-300 bg-green-50 p-8">
          <h1 className="text-xl font-bold text-green-800">ส่งคำขอเรียบร้อยแล้ว ✅</h1>
          <p className="mt-3 text-sm text-green-700">
            กรรมการชมรมจะตรวจสอบคำขอ และติดต่อกลับตามช่องทางที่ท่านให้ไว้
            เพื่อนัดหมายเวลารับเครื่อง
          </p>
        </div>
        <Link
          href="/radios"
          className="mt-6 inline-block text-sm text-blue-600 hover:underline"
        >
          ← กลับไปหน้ารายการวิทยุ
        </Link>
      </main>
    );
  }

  // Only radios that can actually be borrowed right now.
  let availableRadios: { id: string; code: string; model: string | null }[] = [];
  try {
    availableRadios = await prisma.radio.findMany({
      where: { status: "AVAILABLE" },
      orderBy: { code: "asc" },
      select: { id: true, code: true, model: true },
    });
  } catch {
    // DB unreachable — form still renders, just without radio options.
  }

  const errorMessage = error ? ERROR_MESSAGES[error] : undefined;

  return (
    <main className="mx-auto w-full max-w-lg px-4 py-10">
      <h1 className="text-2xl font-bold text-gray-900">แบบฟอร์มขอยืมวิทยุ (บุคคลภายนอก)</h1>
      <p className="mt-2 text-sm text-gray-600">
        สำหรับชมรมอื่นหรือบุคคลภายนอก — ไม่ต้องสมัครสมาชิก
        กรอกข้อมูลแล้วกรรมการชมรมจะติดต่อกลับ
      </p>

      {errorMessage && (
        <div className="mt-4 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMessage}
        </div>
      )}

      <form
        action={createExternalRequest}
        className="mt-6 space-y-4 rounded-xl border border-gray-200 bg-white p-6 shadow-sm"
      >
        <div>
          <label htmlFor="externalName" className="block text-sm font-medium text-gray-700">
            ชื่อ-นามสกุล
          </label>
          <input
            type="text"
            id="externalName"
            name="externalName"
            required
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label htmlFor="externalOrg" className="block text-sm font-medium text-gray-700">
            หน่วยงาน / ชมรม
          </label>
          <input
            type="text"
            id="externalOrg"
            name="externalOrg"
            required
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label htmlFor="externalContact" className="block text-sm font-medium text-gray-700">
            ช่องทางติดต่อ (เบอร์โทร / LINE ID)
          </label>
          <input
            type="text"
            id="externalContact"
            name="externalContact"
            required
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700">
            อีเมล (สำหรับแจ้งเตือนนัดรับเครื่อง)
          </label>
          <input
            type="email"
            id="email"
            name="email"
            required
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label htmlFor="radioId" className="block text-sm font-medium text-gray-700">
            วิทยุที่ต้องการยืม
          </label>
          <select
            id="radioId"
            name="radioId"
            required
            defaultValue={preselectedRadioId ?? ""}
            className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
          >
            <option value="" disabled>
              — เลือกวิทยุ —
            </option>
            {availableRadios.map((r) => (
              <option key={r.id} value={r.id}>
                {r.code} {r.model ? `(${r.model})` : ""}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="dueAt" className="block text-sm font-medium text-gray-700">
            กำหนดคืน (วันที่จะนำมาคืน)
          </label>
          <input
            type="date"
            id="dueAt"
            name="dueAt"
            required
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
        </div>

        <button
          type="submit"
          className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700"
        >
          ส่งคำขอยืม
        </button>
      </form>
    </main>
  );
}
