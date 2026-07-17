// Admin borrow queue — approve/reject requests, mark radios returned.
// Members' and external borrowers' requests appear in the same queue.
// Protected by proxy.ts AND requireAdmin() (server-side, per CLAUDE.md).

import BorrowStatusBadge from "@/components/borrows/BorrowStatusBadge";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatDate, isOverdue } from "@/lib/utils";
import { approveBorrow, markReturned, rejectBorrow } from "./actions";

export const dynamic = "force-dynamic";

const MESSAGES: Record<string, { text: string; kind: "ok" | "error" }> = {
  approved: { text: "อนุมัติคำขอเรียบร้อยแล้ว", kind: "ok" },
  rejected: { text: "ปฏิเสธคำขอเรียบร้อยแล้ว", kind: "ok" },
  returned: { text: "บันทึกการคืนเรียบร้อยแล้ว", kind: "ok" },
  "invalid-pickup": { text: "กรุณาระบุวันเวลานัดรับเครื่อง", kind: "error" },
  "not-pending": { text: "คำขอนี้ถูกจัดการไปแล้ว", kind: "error" },
  "radio-taken": {
    text: "วิทยุเครื่องนี้ไม่ว่างแล้ว (ถูกยืมหรือส่งซ่อม) — ปฏิเสธคำขอนี้หรือรอเครื่องว่าง",
    kind: "error",
  },
  "not-active": { text: "รายการนี้ไม่ได้อยู่ในสถานะกำลังยืม", kind: "error" },
};

// Small helper — who is borrowing, for both member and external records.
function borrowerInfo(record: {
  borrowerType: "MEMBER" | "EXTERNAL";
  user: { name: string | null; email: string | null } | null;
  externalName: string | null;
  externalOrg: string | null;
  externalContact: string | null;
}) {
  if (record.borrowerType === "MEMBER") {
    return `${record.user?.name ?? "สมาชิก"} (${record.user?.email ?? "-"})`;
  }
  return `${record.externalName ?? "-"} — ${record.externalOrg ?? "-"} (${record.externalContact ?? "-"})`;
}

export default async function AdminBorrowsPage({
  searchParams,
}: {
  searchParams: Promise<{ approved?: string; rejected?: string; returned?: string; error?: string }>;
}) {
  await requireAdmin();
  const params = await searchParams;
  const messageKey =
    params.error ??
    (params.approved ? "approved" : params.rejected ? "rejected" : params.returned ? "returned" : undefined);
  const message = messageKey ? MESSAGES[messageKey] : undefined;

  const include = {
    radio: { select: { code: true, model: true, status: true } },
    user: { select: { name: true, email: true } },
  } as const;

  const [pending, active, history] = await Promise.all([
    prisma.borrowRecord.findMany({
      where: { status: "PENDING" },
      include,
      orderBy: { requestedAt: "asc" }, // oldest requests first
    }),
    prisma.borrowRecord.findMany({
      where: { status: "APPROVED" },
      include,
      orderBy: { dueAt: "asc" }, // soonest due first
    }),
    prisma.borrowRecord.findMany({
      where: { status: { in: ["RETURNED", "REJECTED"] } },
      include,
      orderBy: { requestedAt: "desc" },
      take: 20,
    }),
  ]);

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-10">
      <h1 className="text-2xl font-bold text-gray-900">คำขอยืม–คืนวิทยุ</h1>

      {message && (
        <div
          className={`mt-4 rounded-lg border px-4 py-3 text-sm ${
            message.kind === "ok"
              ? "border-green-300 bg-green-50 text-green-700"
              : "border-red-300 bg-red-50 text-red-700"
          }`}
        >
          {message.text}
        </div>
      )}

      {/* ---------- Pending requests ---------- */}
      <section className="mt-8">
        <h2 className="text-lg font-semibold text-gray-900">
          คำขอรออนุมัติ ({pending.length})
        </h2>
        {pending.length === 0 ? (
          <p className="mt-3 text-sm text-gray-500">ไม่มีคำขอค้างอยู่ 🎉</p>
        ) : (
          <div className="mt-4 space-y-4">
            {pending.map((record) => (
              <div
                key={record.id}
                className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="text-sm">
                    <p className="font-semibold text-gray-900">
                      {record.radio.code}
                      {record.radio.model && (
                        <span className="ml-2 font-normal text-gray-500">
                          {record.radio.model}
                        </span>
                      )}
                      {record.radio.status !== "AVAILABLE" && (
                        <span className="ml-2 text-xs text-red-600">
                          (เครื่องไม่ว่างแล้ว)
                        </span>
                      )}
                    </p>
                    <p className="mt-1 text-gray-700">{borrowerInfo(record)}</p>
                    <p className="mt-1 text-gray-500">
                      {record.borrowerType === "MEMBER" ? "สมาชิกชมรม" : "บุคคลภายนอก"} · ยื่นคำขอ{" "}
                      {formatDate(record.requestedAt)} · กำหนดคืน {formatDate(record.dueAt)}
                    </p>
                  </div>
                  <BorrowStatusBadge status="PENDING" />
                </div>

                <div className="mt-4 flex flex-wrap items-end gap-3">
                  {/* Approve — needs a pickup appointment */}
                  <form action={approveBorrow} className="flex flex-wrap items-end gap-3">
                    <input type="hidden" name="recordId" value={record.id} />
                    <div>
                      <label
                        htmlFor={`pickupAt-${record.id}`}
                        className="block text-xs font-medium text-gray-700"
                      >
                        นัดรับเครื่อง (วัน–เวลา)
                      </label>
                      <input
                        type="datetime-local"
                        id={`pickupAt-${record.id}`}
                        name="pickupAt"
                        required
                        className="mt-1 rounded-lg border border-gray-300 px-3 py-1.5 text-sm"
                      />
                    </div>
                    <button
                      type="submit"
                      className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
                    >
                      อนุมัติ
                    </button>
                  </form>
                  {/* Reject */}
                  <form action={rejectBorrow}>
                    <input type="hidden" name="recordId" value={record.id} />
                    <button
                      type="submit"
                      className="rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
                    >
                      ปฏิเสธ
                    </button>
                  </form>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ---------- Active borrows ---------- */}
      <section className="mt-10">
        <h2 className="text-lg font-semibold text-gray-900">
          กำลังยืมอยู่ ({active.length})
        </h2>
        {active.length === 0 ? (
          <p className="mt-3 text-sm text-gray-500">ไม่มีวิทยุที่ถูกยืมอยู่</p>
        ) : (
          <div className="mt-4 space-y-4">
            {active.map((record) => {
              const overdue = isOverdue(record);
              return (
                <div
                  key={record.id}
                  className={`rounded-xl border bg-white p-5 shadow-sm ${
                    overdue ? "border-red-300" : "border-gray-200"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="text-sm">
                      <p className="font-semibold text-gray-900">
                        {record.radio.code}
                        {record.radio.model && (
                          <span className="ml-2 font-normal text-gray-500">
                            {record.radio.model}
                          </span>
                        )}
                      </p>
                      <p className="mt-1 text-gray-700">{borrowerInfo(record)}</p>
                      <p className="mt-1 text-gray-500">
                        นัดรับ {formatDate(record.pickupAt)} · กำหนดคืน {formatDate(record.dueAt)}
                      </p>
                    </div>
                    <BorrowStatusBadge status={overdue ? "OVERDUE" : "APPROVED"} />
                  </div>

                  {/* Mark returned (walk-in / external) */}
                  <form action={markReturned} className="mt-4 flex flex-wrap items-end gap-3">
                    <input type="hidden" name="recordId" value={record.id} />
                    <div className="grow">
                      <label
                        htmlFor={`returnNote-${record.id}`}
                        className="block text-xs font-medium text-gray-700"
                      >
                        หมายเหตุการคืน (ไม่บังคับ เช่น สภาพเครื่อง)
                      </label>
                      <input
                        type="text"
                        id={`returnNote-${record.id}`}
                        name="returnNote"
                        className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm"
                      />
                    </div>
                    <button
                      type="submit"
                      className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                    >
                      บันทึกการคืน
                    </button>
                  </form>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ---------- Recent history ---------- */}
      <section className="mt-10">
        <h2 className="text-lg font-semibold text-gray-900">ประวัติล่าสุด</h2>
        {history.length === 0 ? (
          <p className="mt-3 text-sm text-gray-500">ยังไม่มีประวัติ</p>
        ) : (
          <div className="mt-4 overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-gray-200 text-xs text-gray-500">
                <tr>
                  <th className="px-4 py-3">วิทยุ</th>
                  <th className="px-4 py-3">ผู้ยืม</th>
                  <th className="px-4 py-3">ยื่นคำขอ</th>
                  <th className="px-4 py-3">คืนเมื่อ</th>
                  <th className="px-4 py-3">สถานะ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {history.map((record) => (
                  <tr key={record.id}>
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {record.radio.code}
                    </td>
                    <td className="px-4 py-3 text-gray-700">{borrowerInfo(record)}</td>
                    <td className="px-4 py-3 text-gray-500">
                      {formatDate(record.requestedAt)}
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {formatDate(record.returnedAt)}
                    </td>
                    <td className="px-4 py-3">
                      <BorrowStatusBadge status={record.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
