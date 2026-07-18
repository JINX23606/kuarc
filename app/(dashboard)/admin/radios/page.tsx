// Admin radio inventory — add, edit, change status, delete.
// Protected by proxy.ts AND requireAdmin() (server-side, per CLAUDE.md).

import StatusBadge from "@/components/radios/StatusBadge";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createRadio, deleteRadio, setRadioStatus, updateRadio } from "./actions";

export const dynamic = "force-dynamic";

const MESSAGES: Record<string, { text: string; kind: "ok" | "error" }> = {
  created: { text: "เพิ่มวิทยุเรียบร้อยแล้ว", kind: "ok" },
  updated: { text: "บันทึกข้อมูลเรียบร้อยแล้ว", kind: "ok" },
  deleted: { text: "ลบวิทยุเรียบร้อยแล้ว", kind: "ok" },
  "missing-code": { text: "กรุณาระบุรหัสเครื่อง (เช่น R001)", kind: "error" },
  "duplicate-code": { text: "รหัสเครื่องนี้มีอยู่แล้ว — ใช้รหัสอื่น", kind: "error" },
  "not-found": { text: "ไม่พบวิทยุเครื่องนี้", kind: "error" },
  "bad-status": { text: "สถานะไม่ถูกต้อง", kind: "error" },
  "radio-borrowed": {
    text: "เครื่องนี้ถูกยืมอยู่ — ต้องบันทึกการคืนก่อนจึงจะเปลี่ยนสถานะได้",
    kind: "error",
  },
  "has-history": {
    text: "เครื่องนี้มีประวัติการยืมแล้ว ลบไม่ได้ — เปลี่ยนสถานะเป็นซ่อมบำรุงแทนถ้าไม่ใช้งานแล้ว",
    kind: "error",
  },
};

export default async function AdminRadiosPage({
  searchParams,
}: {
  searchParams: Promise<{ created?: string; updated?: string; deleted?: string; error?: string }>;
}) {
  await requireAdmin();
  const params = await searchParams;
  const messageKey =
    params.error ??
    (params.created ? "created" : params.updated ? "updated" : params.deleted ? "deleted" : undefined);
  const message = messageKey ? MESSAGES[messageKey] : undefined;

  const radios = await prisma.radio.findMany({
    orderBy: { code: "asc" },
    include: { _count: { select: { borrowRecords: true } } },
  });

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-10">
      <h1 className="text-2xl font-bold text-gray-900">จัดการวิทยุ</h1>

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

      {/* ---------- Add a radio ---------- */}
      <section className="mt-8 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900">เพิ่มวิทยุใหม่</h2>
        <form action={createRadio} className="mt-4 flex flex-wrap items-end gap-3">
          <div>
            <label htmlFor="new-code" className="block text-xs font-medium text-gray-700">
              รหัสเครื่อง *
            </label>
            <input
              type="text"
              id="new-code"
              name="code"
              required
              placeholder="R001"
              className="mt-1 w-28 rounded-lg border border-gray-300 px-3 py-1.5 text-sm"
            />
          </div>
          <div>
            <label htmlFor="new-model" className="block text-xs font-medium text-gray-700">
              รุ่น
            </label>
            <input
              type="text"
              id="new-model"
              name="model"
              placeholder="เช่น IC-2300H"
              className="mt-1 rounded-lg border border-gray-300 px-3 py-1.5 text-sm"
            />
          </div>
          <div className="grow">
            <label htmlFor="new-note" className="block text-xs font-medium text-gray-700">
              หมายเหตุ
            </label>
            <input
              type="text"
              id="new-note"
              name="note"
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm"
            />
          </div>
          <button
            type="submit"
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            เพิ่มวิทยุ
          </button>
        </form>
      </section>

      {/* ---------- Inventory list ---------- */}
      <section className="mt-8">
        <h2 className="text-lg font-semibold text-gray-900">
          วิทยุทั้งหมด ({radios.length})
        </h2>
        {radios.length === 0 ? (
          <p className="mt-3 text-sm text-gray-500">
            ยังไม่มีวิทยุในระบบ — เพิ่มเครื่องแรกจากฟอร์มด้านบน
          </p>
        ) : (
          <div className="mt-4 space-y-4">
            {radios.map((radio) => (
              <div
                key={radio.id}
                className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-semibold text-gray-900">
                    {radio.code}
                    <span className="ml-2 text-xs font-normal text-gray-500">
                      ยืมไปแล้ว {radio._count.borrowRecords} ครั้ง
                    </span>
                  </p>
                  <StatusBadge status={radio.status} />
                </div>

                {/* Edit model / note */}
                <form action={updateRadio} className="mt-4 flex flex-wrap items-end gap-3">
                  <input type="hidden" name="radioId" value={radio.id} />
                  <div>
                    <label
                      htmlFor={`model-${radio.id}`}
                      className="block text-xs font-medium text-gray-700"
                    >
                      รุ่น
                    </label>
                    <input
                      type="text"
                      id={`model-${radio.id}`}
                      name="model"
                      defaultValue={radio.model ?? ""}
                      className="mt-1 rounded-lg border border-gray-300 px-3 py-1.5 text-sm"
                    />
                  </div>
                  <div className="grow">
                    <label
                      htmlFor={`note-${radio.id}`}
                      className="block text-xs font-medium text-gray-700"
                    >
                      หมายเหตุ
                    </label>
                    <input
                      type="text"
                      id={`note-${radio.id}`}
                      name="note"
                      defaultValue={radio.note ?? ""}
                      className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm"
                    />
                  </div>
                  <button
                    type="submit"
                    className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    บันทึก
                  </button>
                </form>

                <div className="mt-3 flex flex-wrap gap-3">
                  {/* Status toggle — blocked server-side while BORROWED */}
                  {radio.status === "AVAILABLE" && (
                    <form action={setRadioStatus}>
                      <input type="hidden" name="radioId" value={radio.id} />
                      <input type="hidden" name="status" value="MAINTENANCE" />
                      <button
                        type="submit"
                        className="rounded-lg border border-yellow-300 px-4 py-2 text-sm font-medium text-yellow-700 hover:bg-yellow-50"
                      >
                        ส่งซ่อมบำรุง
                      </button>
                    </form>
                  )}
                  {radio.status === "MAINTENANCE" && (
                    <form action={setRadioStatus}>
                      <input type="hidden" name="radioId" value={radio.id} />
                      <input type="hidden" name="status" value="AVAILABLE" />
                      <button
                        type="submit"
                        className="rounded-lg border border-green-300 px-4 py-2 text-sm font-medium text-green-700 hover:bg-green-50"
                      >
                        กลับมาพร้อมให้ยืม
                      </button>
                    </form>
                  )}
                  {/* Delete — server-side blocks radios that have history */}
                  {radio._count.borrowRecords === 0 && (
                    <form action={deleteRadio}>
                      <input type="hidden" name="radioId" value={radio.id} />
                      <button
                        type="submit"
                        className="rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
                      >
                        ลบ
                      </button>
                    </form>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
