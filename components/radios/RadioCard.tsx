// Card for one radio in the public /radios list.
import Link from "next/link";
import type { RadioStatus } from "@prisma/client";
import StatusBadge from "./StatusBadge";

// Plain shape (not the full Prisma model) so the card also works with
// mock data before the database is connected.
export interface RadioCardData {
  id: string;
  code: string;
  model: string | null;
  status: RadioStatus;
  note: string | null;
}

export default function RadioCard({ radio }: { radio: RadioCardData }) {
  return (
    <Link
      href={`/radios/${radio.id}`}
      className="block rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">{radio.code}</h2>
          <p className="text-sm text-gray-600">{radio.model ?? "ไม่ระบุรุ่น"}</p>
        </div>
        <StatusBadge status={radio.status} />
      </div>
      {radio.note && (
        <p className="mt-3 text-xs text-gray-500">หมายเหตุ: {radio.note}</p>
      )}
    </Link>
  );
}
