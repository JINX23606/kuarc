// Colored badge for a borrow record's status.
// "OVERDUE" is computed by the caller (dueAt < now, not returned) —
// it is not stored in the database.
import type { BorrowStatus } from "@prisma/client";

const STATUS_CONFIG: Record<BorrowStatus, { label: string; className: string }> = {
  PENDING: { label: "รออนุมัติ", className: "bg-gray-100 text-gray-800" },
  APPROVED: { label: "กำลังยืม", className: "bg-blue-100 text-blue-800" },
  RETURNED: { label: "คืนแล้ว", className: "bg-green-100 text-green-800" },
  REJECTED: { label: "ไม่อนุมัติ", className: "bg-red-100 text-red-700" },
  OVERDUE: { label: "เกินกำหนด", className: "bg-red-600 text-white" },
};

export default function BorrowStatusBadge({ status }: { status: BorrowStatus }) {
  const { label, className } = STATUS_CONFIG[status];
  return (
    <span
      className={`inline-block rounded-full px-3 py-1 text-xs font-medium ${className}`}
    >
      {label}
    </span>
  );
}
