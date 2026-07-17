// Small colored badge showing a radio's status.
import type { RadioStatus } from "@prisma/client";

// Label + Tailwind classes per status
const STATUS_CONFIG: Record<RadioStatus, { label: string; className: string }> = {
  AVAILABLE: { label: "พร้อมให้ยืม", className: "bg-green-100 text-green-800" },
  BORROWED: { label: "ถูกยืมอยู่", className: "bg-blue-100 text-blue-800" },
  MAINTENANCE: { label: "ซ่อมบำรุง", className: "bg-yellow-100 text-yellow-800" },
};

export default function StatusBadge({ status }: { status: RadioStatus }) {
  const { label, className } = STATUS_CONFIG[status];
  return (
    <span
      className={`inline-block rounded-full px-3 py-1 text-xs font-medium ${className}`}
    >
      {label}
    </span>
  );
}
