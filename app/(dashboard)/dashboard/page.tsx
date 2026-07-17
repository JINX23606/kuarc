// Dashboard overview — stats for members, plus queue/overdue info for admins.
// Route is protected by proxy.ts, but we ALSO check the session here
// (server-side defense in depth, per CLAUDE.md).

import Link from "next/link";
import { redirect } from "next/navigation";
import BorrowStatusBadge from "@/components/borrows/BorrowStatusBadge";
import StatsCard from "@/components/dashboard/StatsCard";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login?callbackUrl=/dashboard");
  }
  const isAdmin = session.user.role === "ADMIN";

  // Radio counts by status + borrow queue counts, all in parallel.
  const [radioCounts, pendingCount, activeCount, overdue, myActive] = await Promise.all([
    prisma.radio.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.borrowRecord.count({ where: { status: "PENDING" } }),
    prisma.borrowRecord.count({ where: { status: "APPROVED" } }),
    // Overdue = APPROVED and past due date (computed, not stored — per CLAUDE.md).
    isAdmin
      ? prisma.borrowRecord.findMany({
          where: { status: "APPROVED", dueAt: { lt: new Date() } },
          include: {
            radio: { select: { code: true, model: true } },
            user: { select: { name: true, email: true } },
          },
          orderBy: { dueAt: "asc" },
        })
      : Promise.resolve([]),
    // Member's own active borrows.
    prisma.borrowRecord.findMany({
      where: { userId: session.user.id, status: "APPROVED" },
      include: { radio: { select: { code: true, model: true } } },
      orderBy: { dueAt: "asc" },
    }),
  ]);

  const countFor = (status: string) =>
    radioCounts.find((row) => row.status === status)?._count._all ?? 0;
  const totalRadios = radioCounts.reduce((sum, row) => sum + row._count._all, 0);

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-10">
      <h1 className="text-2xl font-bold text-gray-900">
        สวัสดี {session.user.name ?? "สมาชิก"} 👋
      </h1>

      {/* ---------- Radio stats ---------- */}
      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatsCard label="วิทยุทั้งหมด" value={totalRadios} />
        <StatsCard label="พร้อมให้ยืม" value={countFor("AVAILABLE")} accent="green" />
        <StatsCard label="ถูกยืมอยู่" value={countFor("BORROWED")} accent="blue" />
        <StatsCard label="ซ่อมบำรุง" value={countFor("MAINTENANCE")} accent="yellow" />
      </div>

      {/* ---------- Admin: queue + overdue ---------- */}
      {isAdmin && (
        <>
          <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <StatsCard label="คำขอรออนุมัติ" value={pendingCount} accent={pendingCount > 0 ? "blue" : "gray"} />
            <StatsCard label="กำลังยืมอยู่" value={activeCount} />
            <StatsCard label="เกินกำหนดคืน" value={overdue.length} accent={overdue.length > 0 ? "red" : "gray"} />
          </div>

          <div className="mt-4 flex flex-wrap gap-3">
            <Link
              href="/admin/borrows"
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              จัดการคำขอยืม–คืน
            </Link>
            <Link
              href="/admin/radios"
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              จัดการวิทยุ
            </Link>
          </div>

          {overdue.length > 0 && (
            <section className="mt-8">
              <h2 className="text-lg font-semibold text-red-700">
                เกินกำหนดคืน ({overdue.length})
              </h2>
              <div className="mt-4 space-y-3">
                {overdue.map((record) => (
                  <div
                    key={record.id}
                    className="rounded-xl border border-red-300 bg-white p-4 text-sm shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold text-gray-900">
                          {record.radio.code}
                          {record.radio.model && (
                            <span className="ml-2 font-normal text-gray-500">
                              {record.radio.model}
                            </span>
                          )}
                        </p>
                        <p className="mt-1 text-gray-700">
                          {record.borrowerType === "MEMBER"
                            ? `${record.user?.name ?? "สมาชิก"} (${record.user?.email ?? "-"})`
                            : `${record.externalName ?? "-"} — ${record.externalOrg ?? "-"} (${record.externalContact ?? "-"})`}
                        </p>
                        <p className="mt-1 text-red-600">
                          กำหนดคืน {formatDate(record.dueAt)}
                        </p>
                      </div>
                      <BorrowStatusBadge status="OVERDUE" />
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </>
      )}

      {/* ---------- Member: my active borrows ---------- */}
      <section className="mt-8">
        <h2 className="text-lg font-semibold text-gray-900">
          วิทยุที่ฉันกำลังยืม ({myActive.length})
        </h2>
        {myActive.length === 0 ? (
          <p className="mt-3 text-sm text-gray-500">
            ยังไม่มีรายการที่กำลังยืม —{" "}
            <Link href="/radios" className="text-blue-600 hover:underline">
              ดูวิทยุที่พร้อมให้ยืม
            </Link>
          </p>
        ) : (
          <div className="mt-4 space-y-3">
            {myActive.map((record) => (
              <div
                key={record.id}
                className="rounded-xl border border-gray-200 bg-white p-4 text-sm shadow-sm"
              >
                <p className="font-semibold text-gray-900">
                  {record.radio.code}
                  {record.radio.model && (
                    <span className="ml-2 font-normal text-gray-500">{record.radio.model}</span>
                  )}
                </p>
                <p className="mt-1 text-gray-500">
                  นัดรับ {formatDate(record.pickupAt)} · กำหนดคืน {formatDate(record.dueAt)}
                </p>
              </div>
            ))}
            <Link
              href="/my-borrows"
              className="inline-block text-sm text-blue-600 hover:underline"
            >
              ดูประวัติทั้งหมด / คืนวิทยุ →
            </Link>
          </div>
        )}
      </section>
    </main>
  );
}
