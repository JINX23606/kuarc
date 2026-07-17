// Radio detail page (PUBLIC) with a "Borrow" section.
// - Logged-in member  → inline request form (creates a PENDING record).
// - Visitor           → link to the external /borrow-request form.
//
// Next.js 16: `params` and `searchParams` are Promises — await them.

import Link from "next/link";
import { notFound } from "next/navigation";
import StatusBadge from "@/components/radios/StatusBadge";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/utils";
import { requestBorrow } from "./actions";

export const dynamic = "force-dynamic";

// Error messages for ?error=... set by the server action.
const ERROR_MESSAGES: Record<string, string> = {
  invalid: "ข้อมูลไม่ครบถ้วน กรุณาลองใหม่",
  "past-due": "กำหนดคืนต้องเป็นวันนี้หรือหลังจากนี้",
  "not-available": "วิทยุเครื่องนี้ไม่พร้อมให้ยืมแล้ว",
  duplicate: "คุณมีคำขอยืมวิทยุเครื่องนี้ค้างอยู่แล้ว — ดูได้ที่หน้า การยืมของฉัน",
};

export default async function RadioDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error } = await searchParams;

  const radio = await prisma.radio.findUnique({ where: { id } });
  if (!radio) notFound();

  const session = await auth();
  const errorMessage = error ? ERROR_MESSAGES[error] : undefined;

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-10">
      <Link href="/radios" className="text-sm text-blue-600 hover:underline">
        ← กลับไปหน้ารายการวิทยุ
      </Link>

      <div className="mt-4 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{radio.code}</h1>
            <p className="mt-1 text-gray-600">{radio.model ?? "ไม่ระบุรุ่น"}</p>
          </div>
          <StatusBadge status={radio.status} />
        </div>

        <dl className="mt-6 space-y-2 text-sm">
          {radio.note && (
            <div className="flex gap-2">
              <dt className="font-medium text-gray-700">หมายเหตุ:</dt>
              <dd className="text-gray-600">{radio.note}</dd>
            </div>
          )}
          <div className="flex gap-2">
            <dt className="font-medium text-gray-700">เพิ่มเข้าระบบเมื่อ:</dt>
            <dd className="text-gray-600">{formatDate(radio.createdAt)}</dd>
          </div>
        </dl>
      </div>

      {/* ---- Borrow section ---- */}
      <div className="mt-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900">ยืมวิทยุเครื่องนี้</h2>

        {errorMessage && (
          <div className="mt-3 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
            {errorMessage}
          </div>
        )}

        {radio.status !== "AVAILABLE" ? (
          <p className="mt-3 text-sm text-gray-500">
            วิทยุเครื่องนี้ยังไม่พร้อมให้ยืมในขณะนี้
          </p>
        ) : session?.user ? (
          // Member: request directly — admin will approve and set pickup time.
          <form action={requestBorrow} className="mt-4 space-y-4">
            <input type="hidden" name="radioId" value={radio.id} />
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
            <p className="text-xs text-gray-500">
              หลังส่งคำขอ กรรมการชมรมจะอนุมัติและนัดหมายเวลารับเครื่อง
            </p>
          </form>
        ) : (
          // Visitor: point to the external borrower form (no account needed).
          <div className="mt-4 space-y-3">
            <Link
              href={`/borrow-request?radio=${radio.id}`}
              className="block w-full rounded-lg bg-blue-600 px-4 py-2.5 text-center text-sm font-medium text-white hover:bg-blue-700"
            >
              กรอกแบบฟอร์มขอยืม (บุคคลภายนอก)
            </Link>
            <p className="text-center text-xs text-gray-500">
              สมาชิกชมรม?{" "}
              <Link
                href={`/login?callbackUrl=/radios/${radio.id}`}
                className="text-blue-600 hover:underline"
              >
                เข้าสู่ระบบ
              </Link>{" "}
              เพื่อยืมได้เลย
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
