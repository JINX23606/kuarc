"use server";

// Admin-only server actions for the radio inventory (CRUD).
// Every action re-checks the ADMIN role server-side (requireAdmin).

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Refresh every page that shows radio data.
function revalidateRadioPages() {
  revalidatePath("/admin/radios");
  revalidatePath("/radios");
  revalidatePath("/dashboard");
}

// Add a new radio to the inventory.
export async function createRadio(formData: FormData) {
  await requireAdmin();

  const code = String(formData.get("code") ?? "").trim().toUpperCase();
  const model = String(formData.get("model") ?? "").trim() || null;
  const note = String(formData.get("note") ?? "").trim() || null;

  if (!code) {
    redirect("/admin/radios?error=missing-code");
  }

  // Friendly duplicate check (code is @unique in the schema).
  const existing = await prisma.radio.findUnique({ where: { code } });
  if (existing) {
    redirect("/admin/radios?error=duplicate-code");
  }

  await prisma.radio.create({ data: { code, model, note } });

  revalidateRadioPages();
  redirect("/admin/radios?created=1");
}

// Edit a radio's model / note.
export async function updateRadio(formData: FormData) {
  await requireAdmin();

  const radioId = String(formData.get("radioId") ?? "");
  const model = String(formData.get("model") ?? "").trim() || null;
  const note = String(formData.get("note") ?? "").trim() || null;

  const radio = await prisma.radio.findUnique({ where: { id: radioId } });
  if (!radio) {
    redirect("/admin/radios?error=not-found");
  }

  await prisma.radio.update({
    where: { id: radioId },
    data: { model, note },
  });

  revalidateRadioPages();
  redirect("/admin/radios?updated=1");
}

// Toggle a radio between AVAILABLE and MAINTENANCE.
// BORROWED is never set here — only the borrow flow changes that.
export async function setRadioStatus(formData: FormData) {
  await requireAdmin();

  const radioId = String(formData.get("radioId") ?? "");
  const status = String(formData.get("status") ?? "");

  if (status !== "AVAILABLE" && status !== "MAINTENANCE") {
    redirect("/admin/radios?error=bad-status");
  }

  const radio = await prisma.radio.findUnique({ where: { id: radioId } });
  if (!radio) {
    redirect("/admin/radios?error=not-found");
  }
  // A borrowed radio must be returned first (via the borrow queue).
  if (radio.status === "BORROWED") {
    redirect("/admin/radios?error=radio-borrowed");
  }

  await prisma.radio.update({
    where: { id: radioId },
    data: { status },
  });

  revalidateRadioPages();
  redirect("/admin/radios?updated=1");
}

// Delete a radio — only allowed when it has no borrow history at all.
// (Radios with history should be set to MAINTENANCE instead, so old
// records keep pointing at a real radio.)
export async function deleteRadio(formData: FormData) {
  await requireAdmin();

  const radioId = String(formData.get("radioId") ?? "");

  const radio = await prisma.radio.findUnique({
    where: { id: radioId },
    include: { _count: { select: { borrowRecords: true } } },
  });
  if (!radio) {
    redirect("/admin/radios?error=not-found");
  }
  if (radio._count.borrowRecords > 0) {
    redirect("/admin/radios?error=has-history");
  }

  await prisma.radio.delete({ where: { id: radioId } });

  revalidateRadioPages();
  redirect("/admin/radios?deleted=1");
}
