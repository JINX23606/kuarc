"use server";

// Server action: a logged-in MEMBER requests to borrow a radio.
// (External visitors never reach this — they use /borrow-request.)

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function requestBorrow(formData: FormData) {
  // Auth check happens HERE (server-side), not just in the UI.
  const session = await auth();
  if (!session?.user) {
    redirect("/login?callbackUrl=/radios");
  }

  const radioId = String(formData.get("radioId") ?? "");
  const dueAtRaw = String(formData.get("dueAt") ?? "");

  const dueAt = new Date(dueAtRaw);
  if (!radioId || !dueAtRaw || isNaN(dueAt.getTime())) {
    redirect(`/radios/${radioId}?error=invalid`);
  }
  // Due date must be in the future (compare against start of today).
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (dueAt < today) {
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
