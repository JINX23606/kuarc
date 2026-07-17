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

  // "Tomorrow" in the server's local time. pickupAt values are parsed and
  // displayed with server-local time throughout the app, so the same clock
  // is used here. The cron is scheduled at 02:00 UTC (= 09:00 Thailand),
  // when the UTC date and the Thai date are the same day.
  const now = new Date();
  const startOfTomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const endOfTomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 2);

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
    const pickupText = record.pickupAt!.toLocaleString("th-TH", {
      dateStyle: "full",
      timeStyle: "short",
    });
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
