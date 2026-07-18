// Daily pickup-reminder job, triggered by Vercel Cron (see vercel.json).
//
// Finds APPROVED borrows with a pickup appointment from now through the end
// of tomorrow (Thai calendar) that haven't been reminded yet, emails the
// borrower via Resend, then marks reminderSent so the next run skips them.
//
// The window starts at "now" (not "start of tomorrow") on purpose: a request
// approved after today's 09:00 run with a pickup later today or tomorrow
// morning would otherwise slide past every run and never be reminded.
// Approval itself also sends immediately for such pickups (see
// lib/reminders.ts) — this run is the safety net if that send failed.
//
// Security: Vercel Cron calls this with "Authorization: Bearer <CRON_SECRET>".
// Set CRON_SECRET in the Vercel env vars — without it the route refuses to run.

import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getResend } from "@/lib/resend";
import { reminderWindowEnd, sendPickupReminder } from "@/lib/reminders";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  // Reject anyone who isn't Vercel Cron (or an admin curl-ing with the secret).
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  if (!getResend()) {
    return Response.json({ error: "RESEND_API_KEY not configured" }, { status: 500 });
  }

  const records = await prisma.borrowRecord.findMany({
    where: {
      status: "APPROVED",
      reminderSent: false,
      email: { not: null },
      pickupAt: { gte: new Date(), lt: reminderWindowEnd() },
    },
    include: { radio: { select: { code: true, model: true } } },
  });

  let sent = 0;
  const failures: string[] = [];

  for (const record of records) {
    const failure = await sendPickupReminder(record);
    if (failure) {
      // Leave reminderSent = false so the next run retries while the
      // pickup is still inside the window.
      failures.push(`${record.id}: ${failure}`);
    } else {
      sent++;
    }
  }

  return Response.json({ checked: records.length, sent, failures });
}
