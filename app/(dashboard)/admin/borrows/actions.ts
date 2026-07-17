"use server";

// Admin-only server actions for the borrow queue.
// Every action re-checks the ADMIN role server-side (requireAdmin).

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Refresh every page whose data this queue touches.
function revalidateBorrowPages() {
  revalidatePath("/admin/borrows");
  revalidatePath("/my-borrows");
  revalidatePath("/radios");
  revalidatePath("/dashboard");
}

// Approve a PENDING request: set the pickup appointment, mark the radio BORROWED.
export async function approveBorrow(formData: FormData) {
  await requireAdmin();

  const recordId = String(formData.get("recordId") ?? "");
  const pickupAtRaw = String(formData.get("pickupAt") ?? "");

  const pickupAt = new Date(pickupAtRaw); // from <input type="datetime-local">
  if (!recordId || !pickupAtRaw || isNaN(pickupAt.getTime())) {
    redirect("/admin/borrows?error=invalid-pickup");
  }

  const record = await prisma.borrowRecord.findUnique({
    where: { id: recordId },
    include: { radio: true },
  });
  if (!record || record.status !== "PENDING") {
    redirect("/admin/borrows?error=not-pending");
  }
  // The radio may have been handed to someone else since this request came in.
  if (record.radio.status !== "AVAILABLE") {
    redirect("/admin/borrows?error=radio-taken");
  }

  await prisma.$transaction([
    prisma.borrowRecord.update({
      where: { id: record.id },
      data: { status: "APPROVED", pickupAt },
    }),
    prisma.radio.update({
      where: { id: record.radioId },
      data: { status: "BORROWED" },
    }),
  ]);

  revalidateBorrowPages();
  redirect("/admin/borrows?approved=1");
}

// Reject a PENDING request (radio stays AVAILABLE).
export async function rejectBorrow(formData: FormData) {
  await requireAdmin();

  const recordId = String(formData.get("recordId") ?? "");
  const record = await prisma.borrowRecord.findUnique({ where: { id: recordId } });
  if (!record || record.status !== "PENDING") {
    redirect("/admin/borrows?error=not-pending");
  }

  await prisma.borrowRecord.update({
    where: { id: record.id },
    data: { status: "REJECTED" },
  });

  revalidateBorrowPages();
  redirect("/admin/borrows?rejected=1");
}

// Mark an APPROVED borrow as returned — for walk-ins and external borrowers
// (members can also self-serve from /my-borrows).
export async function markReturned(formData: FormData) {
  await requireAdmin();

  const recordId = String(formData.get("recordId") ?? "");
  const returnNote = String(formData.get("returnNote") ?? "").trim() || null;

  const record = await prisma.borrowRecord.findUnique({ where: { id: recordId } });
  if (!record || record.status !== "APPROVED") {
    redirect("/admin/borrows?error=not-active");
  }

  await prisma.$transaction([
    prisma.borrowRecord.update({
      where: { id: record.id },
      data: { status: "RETURNED", returnedAt: new Date(), returnNote },
    }),
    prisma.radio.update({
      where: { id: record.radioId },
      data: { status: "AVAILABLE" },
    }),
  ]);

  revalidateBorrowPages();
  redirect("/admin/borrows?returned=1");
}
