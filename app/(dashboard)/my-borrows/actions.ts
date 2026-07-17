"use server";

// Server action: member returns a radio they are currently borrowing.
// Sets returnedAt + status RETURNED and frees the radio (AVAILABLE).

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function returnBorrow(formData: FormData) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login?callbackUrl=/my-borrows");
  }

  const recordId = String(formData.get("recordId") ?? "");

  const record = await prisma.borrowRecord.findUnique({
    where: { id: recordId },
  });

  // Ownership + state checks — server-side, per CLAUDE.md.
  // Only the borrower can return their own APPROVED (active) record.
  if (!record || record.userId !== session.user.id || record.status !== "APPROVED") {
    redirect("/my-borrows?error=cannot-return");
  }

  // Update record and free the radio together.
  await prisma.$transaction([
    prisma.borrowRecord.update({
      where: { id: record.id },
      data: { status: "RETURNED", returnedAt: new Date() },
    }),
    prisma.radio.update({
      where: { id: record.radioId },
      data: { status: "AVAILABLE" },
    }),
  ]);

  revalidatePath("/my-borrows");
  revalidatePath("/radios");
  redirect("/my-borrows?returned=1");
}
