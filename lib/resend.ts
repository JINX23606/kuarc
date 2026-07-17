// Resend email client (transactional email for pickup reminders).
//
// Required env var: RESEND_API_KEY (set in Vercel project settings).
// Optional: EMAIL_FROM — defaults to Resend's shared test sender, which is
// fine for development; set a verified domain sender for production.

import { Resend } from "resend";

// Returns null when the API key isn't configured yet, so callers can
// skip sending instead of crashing (e.g. in local dev without the key).
export function getResend(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return null;
  return new Resend(apiKey);
}

export const EMAIL_FROM =
  process.env.EMAIL_FROM ?? "KUARC RadioTrack <onboarding@resend.dev>";
