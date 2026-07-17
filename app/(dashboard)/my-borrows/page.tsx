// Member's own borrow history + self-service return.
// Route is protected by proxy.ts, but we ALSO check the session here
// (server-side defense in depth, per CLAUDE.md).

import Link from "next/link";
import { redirect } from "next/navigation";
import BorrowStatusBadge from "@/components/borrows/BorrowStatusBadge";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatDate, isOverdue } from "@/lib/utils";
import { returnBorrow } from "./actions";

export const dynamic = "force-dynamic";

export default async function MyBorrowsPage({
  searchParams,
}: {
  searchParams: Promise<{ requested?: string; returned?: string; error?: string }>;
}) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login?callbackUrl=/my-borrows");
  }

  const { requested, returned, error } = await searchParams;

  const records = await prisma.borrowRecord.findMany({
    where: { userId: session.user.id },
    include: { radio: { select: { code: true, model: true } } },
    orderBy: { requestedAt: "desc" },
  });

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10">
      <h1 className="text-2xl font-bold text-gray-900">การยืมของฉัน</h1>

      {requested && (
        <div className="mt-4 rounded-lg border border-green-300 bg-green-50 px-4 py-3 text-sm text-green-700">
          ส่งคำขอยืมเรียบร้อยแล้ว — รอกรรมการชมรมอนุมัติและนัดหมายเวลารับเครื่อง
        </div>
      )}
      {returned && (
        <div className="mt-4 rounded-lg border border-green-300 bg-green-50 px-4 py-3 text-sm text-green-700">
          บันทึกการคืนเรียบร้อยแล้ว ขอบคุณครับ/ค่ะ
        </div>
      )}
      {error === "cannot-return" && (
        <div className="mt-4 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
          ไม่สามารถบันทึกการคืนได้ — รายการนี้อาจถูกคืนไปแล้วหรือไม่ใช่รายการของคุณ
        </div>
      )}

      {records.length === 0 ? (
        <div className="mt-8 rounded-xl border border-gray-200 bg-white p-8 text-center">
          <p className="text-gray-500">คุณยังไม่เคยยืมวิทยุ</p>
          <Link
            href="/radios"
            className="mt-3 inline-block text-sm text-blue-600 hover:underline"
          >
            ดูรายการวิทยุที่ยืมได้ →
          </Link>
        </div>
      ) : (
        <div className="mt-6 space-y-4">
          {records.map((record) => {
            const overdue = isOverdue(record);
            return (
              <div
                key={record.id}
                className={`rounded-xl border bg-white p-5 shadow-sm ${
                  overdue ? "border-red-300" : "border-gray-200"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h2 className="font-semibold text-gray-900">
                      {record.radio.code}
                      {record.radio.model && (
                        <span className="ml-2 font-normal text-gray-500">
                          {record.radio.model}
                        </span>
                      )}
                    </h2>
                    <dl className="mt-2 space-y-1 text-sm text-gray-600">
                      <div>ยื่นคำขอ: {formatDate(record.requestedAt)}</div>
                      {record.pickupAt && <div>นัดรับเครื่อง: {formatDate(record.pickupAt)}</div>}
                      <div>กำหนดคืน: {formatDate(record.dueAt)}</div>
                      {record.returnedAt && <div>คืนเมื่อ: {formatDate(record.returnedAt)}</div>}
                      {record.returnNote && <div>หมายเหตุ: {record.returnNote}</div>}
                    </dl>
                  </div>
                  {/* Show computed OVERDUE over the stored status */}
                  <BorrowStatusBadge status={overdue ? "OVERDUE" : record.status} />
                </div>

                {record.status === "APPROVED" && (
                  <form action={returnBorrow} className="mt-4">
                    <input type="hidden" name="recordId" value={record.id} />
                    <button
                      type="submit"
                      className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
                    >
                      แจ้งคืนวิทยุ
                    </button>
                  </form>
                )}
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
