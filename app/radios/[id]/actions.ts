"use server";

// Server action: a logged-in MEMBER requests to borrow a radio.
// (External visitors never reach this — they use /borrow-request.)

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseBangkok, startOfTodayBangkok } from "@/lib/utils";

export async function requestBorrow(formData: FormData) {
  // Auth check happens HERE (server-side), not just in the UI.
  const session = await auth();
  if (!session?.user) {
    redirect("/login?callbackUrl=/radios");
  }

  const radioId = String(formData.get("radioId") ?? "");
  const dueAtRaw = String(formData.get("dueAt") ?? "");

  const dueAt = parseBangkok(dueAtRaw); // <input type="date">, Thai time
  if (!radioId || !dueAtRaw || isNaN(dueAt.getTime())) {
    redirect(`/radios/${radioId}?error=invalid`);
  }
  // Due date must be today or later (Thai calendar day).
  if (dueAt < startOfTodayBangkok()) {
    redirect(`/radios/${radioId}?error=past-due`);
  }

  const radio = await prisma.radio.findUnique({ where: { id: radioId } });
  if (!radio) {
    redirect("/radios");
  }
  if (radio.status !== "AVAILABLE") {
    redirect(`/radios/${radioId}?error=not-available`);
  }

  // One open request per member per radio — avoid accidental duplicates.
  const existing = await prisma.borrowRecord.findFirst({
    where: {
      radioId,
      userId: session.user.id,
      status: { in: ["PENDING", "APPROVED"] },
    },
  });
  if (existing) {
    redirect(`/radios/${radioId}?error=duplicate`);
  }

  await prisma.borrowRecord.create({
    data: {
      radioId,
      borrowerType: "MEMBER",
      userId: session.user.id,
      email: session.user.email, // reminder target
      status: "PENDING",
      dueAt,
    },
  });

  revalidatePath("/my-borrows");
  redirect("/my-borrows?requested=1");
}
