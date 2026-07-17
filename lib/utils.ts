// Small shared helpers.
//
// Timezone convention: dates are stored in the DB as real instants (UTC)
// and both parsed and displayed in Thailand time (Asia/Bangkok), so the
// app behaves the same whether the server runs in UTC (Vercel) or local dev.

export const TIME_ZONE = "Asia/Bangkok";
const BANGKOK_OFFSET = "+07:00";
const BANGKOK_OFFSET_MS = 7 * 60 * 60 * 1000;

// Format a date for display in Thai locale (e.g. "17 ก.ค. 2569").
// Returns "-" for null/undefined so callers can pass optional dates directly.
export function formatDate(date: Date | null | undefined): string {
  if (!date) return "-";
  return date.toLocaleDateString("th-TH", { dateStyle: "medium", timeZone: TIME_ZONE });
}

// Date + time for appointments (e.g. "19 ก.ค. 2569 10:00").
export function formatDateTime(date: Date | null | undefined): string {
  if (!date) return "-";
  return date.toLocaleString("th-TH", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: TIME_ZONE,
  });
}

// Parse a form value from <input type="date"> ("2026-07-21") or
// <input type="datetime-local"> ("2026-07-19T10:00") as THAI wall time,
// returning the real instant. Malformed input yields an invalid Date —
// callers already isNaN-check.
export function parseBangkok(raw: string): Date {
  if (!raw) return new Date(NaN);
  const withTime = raw.includes("T") ? raw : `${raw}T00:00`;
  // datetime-local may or may not include seconds depending on the browser
  const withSeconds = /T\d{2}:\d{2}$/.test(withTime) ? `${withTime}:00` : withTime;
  return new Date(`${withSeconds}${BANGKOK_OFFSET}`);
}

// Midnight today in Bangkok, as a real instant — the "no past due dates" cutoff.
export function startOfTodayBangkok(): Date {
  const nowBkk = new Date(Date.now() + BANGKOK_OFFSET_MS);
  return new Date(
    Date.UTC(nowBkk.getUTCFullYear(), nowBkk.getUTCMonth(), nowBkk.getUTCDate()) -
      BANGKOK_OFFSET_MS
  );
}

// True if a borrow record should be shown as overdue:
// past its due date and not returned yet. (Computed, not stored — per CLAUDE.md.)
export function isOverdue(record: {
  dueAt: Date | null;
  returnedAt: Date | null;
  status: string;
}): boolean {
  return (
    record.status === "APPROVED" &&
    record.returnedAt === null &&
    record.dueAt !== null &&
    record.dueAt < new Date()
  );
}
