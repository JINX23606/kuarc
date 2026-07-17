"use server";

// Server action: external borrower (no account) submits a borrow request.
// Creates a PENDING record with borrowerType = EXTERNAL for admin review.

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { parseBangkok, startOfTodayBangkok } from "@/lib/utils";

export async function createExternalRequest(formData: FormData) {
  const radioId = String(formData.get("radioId") ?? "");
  const externalName = String(formData.get("externalName") ?? "").trim();
  const externalOrg = String(formData.get("externalOrg") ?? "").trim();
  const externalContact = String(formData.get("externalContact") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const dueAtRaw = String(formData.get("dueAt") ?? "");

  // Basic validation — the form has `required` too, but never trust the client.
  const dueAt = parseBangkok(dueAtRaw); // <input type="date">, Thai time
  if (!externalName || !externalOrg || !externalContact || !email || !radioId || isNaN(dueAt.getTime())) {
    redirect(`/borrow-request?radio=${radioId}&error=invalid`);
  }
  if (dueAt < startOfTodayBangkok()) {
    redirect(`/borrow-request?radio=${radioId}&error=past-due`);
  }

  const radio = await prisma.radio.findUnique({ where: { id: radioId } });
  if (!radio || radio.status !== "AVAILABLE") {
    redirect(`/borrow-request?error=not-available`);
  }

  await prisma.borrowRecord.create({
    data: {
      radioId,
      borrowerType: "EXTERNAL",
      externalName,
      externalOrg,
      externalContact,
      email, // reminder target
      status: "PENDING",
      dueAt,
    },
  });

  redirect("/borrow-request?success=1");
}
