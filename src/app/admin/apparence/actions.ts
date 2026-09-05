"use server";

import { revalidatePath } from "next/cache";

import { db, currentTenantId } from "@/lib/tenant-db";
import { requireRole } from "@/lib/auth";
import { deleteImage } from "@/lib/storage";
import { safeColor, DEFAULT_PRIMARY, DEFAULT_ACCENT, type Highlight } from "@/lib/theme";

export type AppearanceState = { ok?: string; error?: string };

export type AppearanceInput = {
  logoUrl: string;
  heroImageUrl: string;
  primaryColor: string;
  accentColor: string;
  heroEyebrow: string;
  heroTitle: string;
  heroSubtitle: string;
  highlights: Highlight[];
  aboutText: string;
  openingHours: string;
};

export async function saveAppearanceAction(
  input: AppearanceInput
): Promise<AppearanceState> {
  await requireRole("ADMIN");
  const prisma = await db();
  const tenantId = await currentTenantId();

  const current = await prisma.settings.findFirst({
    select: { logoUrl: true, heroImageUrl: true },
  });

  const highlights = (input.highlights ?? [])
    .map((item) => ({
      title: (item.title ?? "").trim(),
      text: (item.text ?? "").trim(),
    }))
    .filter((item) => item.title)
    .slice(0, 6);

  await prisma.settings.update({
    where: { tenantId },
    data: {
      logoUrl: input.logoUrl.trim(),
      heroImageUrl: input.heroImageUrl.trim(),
      primaryColor: safeColor(input.primaryColor, DEFAULT_PRIMARY),
      accentColor: safeColor(input.accentColor, DEFAULT_ACCENT),
      heroEyebrow: input.heroEyebrow.trim(),
      heroTitle: input.heroTitle.trim(),
      heroSubtitle: input.heroSubtitle.trim(),
      highlights,
      aboutText: input.aboutText.trim(),
      openingHours: input.openingHours.trim(),
    },
  });

  // Les images remplacées ne servent plus : on les efface du stockage.
  if (current?.logoUrl && current.logoUrl !== input.logoUrl) {
    await deleteImage(tenantId, current.logoUrl);
  }
  if (current?.heroImageUrl && current.heroImageUrl !== input.heroImageUrl) {
    await deleteImage(tenantId, current.heroImageUrl);
  }

  revalidatePath("/admin/apparence");
  revalidatePath("/");

  return { ok: "Apparence enregistrée. Vérifiez le rendu sur votre boutique." };
}
