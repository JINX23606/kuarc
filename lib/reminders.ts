// Shared pickup-reminder email logic, used from two places:
//
//  - the daily cron (app/api/cron/send-reminders) — the normal day-before pass
//  - approveBorrow (admin action) — immediate send when the admin approves a
//    request whose pickup is already today or tomorrow, because the daily
//    09:00 run has either already happened or would come too late. Without
//    this, a request approved at 14:00 with pickup the next morning would
//    never get a reminder (the "cron window gap").
//
// A record is only ever reminded once: reminderSent is set on success, and
// both callers filter/skip on it.

import { prisma } from "@/lib/prisma";
import { EMAIL_FROM, getResend } from "@/lib/resend";
import { formatDateTime, startOfTodayBangkok } from "@/lib/utils";

const DAY_MS = 24 * 60 * 60 * 1000;

// End of tomorrow (Thai calendar) as a real instant. Pickups before this
// cutoff are "soon" — they get a reminder now rather than waiting for the
// next cron run.
export function reminderWindowEnd(): Date {
  return new Date(startOfTodayBangkok().getTime() + 2 * DAY_MS);
}

// The fields sendPickupReminder needs — satisfied by a BorrowRecord loaded
// with its radio relation.
type ReminderRecord = {
  id: string;
  email: string | null;
  pickupAt: Date | null;
  radio: { code: string; model: string | null };
};

// Email one borrower about their upcoming pickup, then mark reminderSent so
// no later run repeats it. Returns null on success, or an error message —
// callers decide whether that's fatal (cron reports it) or best-effort
// (approval logs it and moves on).
export async function sendPickupReminder(record: ReminderRecord): Promise<string | null> {
  const resend = getResend();
  if (!resend) return "RESEND_API_KEY not configured";
  if (!record.email || !record.pickupAt) return "record has no email or pickup time";

  // "วันนี้" when the pickup is later today (approval-time sends and same-day
  // cron retries), "พรุ่งนี้" when it's tomorrow — by Thai calendar day.
  const daysAway = Math.floor(
    (record.pickupAt.getTime() - startOfTodayBangkok().getTime()) / DAY_MS
  );
  const dayWord = daysAway === 0 ? "วันนี้" : "พรุ่งนี้";

  const pickupText = formatDateTime(record.pickupAt); // Thai time
  const radioText = record.radio.model
    ? `${record.radio.code} (${record.radio.model})`
    : record.radio.code;

  const { error } = await resend.emails.send({
    from: EMAIL_FROM,
    to: record.email,
    subject: `แจ้งเตือนนัดรับวิทยุ ${radioText} — ${dayWord}`,
    text:
      `${dayWord}ท่านมีนัดรับเวลา ${pickupText} กรุณาเตรียมสัญญาและมาให้ตรงเวลา\n\n` +
      `วิทยุ: ${radioText}\n` +
      `— KUARC RadioTrack ชมรมวิทยุสมัครเล่น มหาวิทยาลัยเกษตรศาสตร์`,
  });

  if (error) return error.message;

  await prisma.borrowRecord.update({
    where: { id: record.id },
    data: { reminderSent: true },
  });
  return null;
}
