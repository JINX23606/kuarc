// Daily pickup-reminder job, triggered by Vercel Cron (see vercel.json).
//
// Finds APPROVED borrows whose pickup appointment is tomorrow and that
// haven't been reminded yet, emails the borrower via Resend, then marks
// reminderSent so the next run skips them.
//
// Security: Vercel Cron calls this with "Authorization: Bearer <CRON_SECRET>".
// Set CRON_SECRET in the Vercel env vars — without it the route refuses to run.

import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { EMAIL_FROM, getResend } from "@/lib/resend";
import { formatDateTime, startOfTodayBangkok } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  // Reject anyone who isn't Vercel Cron (or an admin curl-ing with the secret).
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const resend = getResend();
  if (!resend) {
    return Response.json({ error: "RESEND_API_KEY not configured" }, { status: 500 });
  }

  // "Tomorrow" as a Thai calendar day, expressed as real instants —
  // correct no matter what timezone the server runs in.
  const DAY_MS = 24 * 60 * 60 * 1000;
  const startOfTomorrow = new Date(startOfTodayBangkok().getTime() + DAY_MS);
  const endOfTomorrow = new Date(startOfTomorrow.getTime() + DAY_MS);

  const records = await prisma.borrowRecord.findMany({
    where: {
      status: "APPROVED",
      reminderSent: false,
      email: { not: null },
      pickupAt: { gte: startOfTomorrow, lt: endOfTomorrow },
    },
    include: { radio: { select: { code: true, model: true } } },
  });

  let sent = 0;
  const failures: string[] = [];

  for (const record of records) {
    const pickupText = formatDateTime(record.pickupAt); // Thai time
    const radioText = record.radio.model
      ? `${record.radio.code} (${record.radio.model})`
      : record.radio.code;

    const { error } = await resend.emails.send({
      from: EMAIL_FROM,
      to: record.email!,
      subject: `แจ้งเตือนนัดรับวิทยุ ${radioText} — พรุ่งนี้`,
      text:
        `พรุ่งนี้ท่านมีนัดรับเวลา ${pickupText} กรุณาเตรียมสัญญาและมาให้ตรงเวลา\n\n` +
        `วิทยุ: ${radioText}\n` +
        `— KUARC RadioTrack ชมรมวิทยุสมัครเล่น มหาวิทยาลัยเกษตรศาสตร์`,
    });

    if (error) {
      // Leave reminderSent = false so tomorrow's run retries (same-day, so
      // still before the appointment if the cron runs early enough).
      failures.push(`${record.id}: ${error.message}`);
      continue;
    }

    await prisma.borrowRecord.update({
      where: { id: record.id },
      data: { reminderSent: true },
    });
    sent++;
  }

  return Response.json({ checked: records.length, sent, failures });
}
