// Small shared helpers.

// Format a date for display in Thai locale (e.g. "17 ก.ค. 2569").
// Returns "-" for null/undefined so callers can pass optional dates directly.
export function formatDate(date: Date | null | undefined): string {
  if (!date) return "-";
  return date.toLocaleDateString("th-TH", { dateStyle: "medium" });
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
