"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdminEmail } from "@/lib/admin";

async function requireAdmin() {
  const sb = await createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!isAdminEmail(user?.email)) {
    throw new Error("Forbidden");
  }
}

export type AdminResult = { ok: boolean; message?: string };

export async function setRequestStatus(
  id: string,
  status: "Requested" | "Planned" | "Filmed",
): Promise<AdminResult> {
  await requireAdmin();
  const admin = createAdminClient();
  const { error } = await admin.from("requests").update({ status }).eq("id", id);
  if (error) return { ok: false, message: error.message };
  revalidatePath("/admin");
  revalidatePath("/requests");
  return { ok: true };
}

// Link a filmed request to the venue that resulted from it (by slug), and mark
// it Filmed.
export async function linkRequestVenue(id: string, slug: string): Promise<AdminResult> {
  await requireAdmin();
  const admin = createAdminClient();

  const trimmed = slug.trim();
  let venueId: string | null = null;
  if (trimmed) {
    const { data: venue } = await admin
      .from("venues")
      .select("id")
      .eq("slug", trimmed)
      .maybeSingle();
    if (!venue) return { ok: false, message: `No venue with slug "${trimmed}"` };
    venueId = (venue as { id: string }).id;
  }

  const { error } = await admin
    .from("requests")
    .update({ filled_venue_id: venueId, status: venueId ? "Filmed" : "Requested" })
    .eq("id", id);
  if (error) return { ok: false, message: error.message };
  revalidatePath("/admin");
  revalidatePath("/requests");
  return { ok: true };
}
