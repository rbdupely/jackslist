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
  status: "Requested" | "Planned" | "Covered",
): Promise<AdminResult> {
  await requireAdmin();
  const admin = createAdminClient();
  const { error } = await admin.from("requests").update({ status }).eq("id", id);
  if (error) return { ok: false, message: error.message };
  revalidatePath("/admin");
  revalidatePath("/requests");
  return { ok: true };
}

// Link a covered request to the item that resulted from it (by slug), and mark
// it Covered.
export async function linkRequestVenue(id: string, slug: string): Promise<AdminResult> {
  await requireAdmin();
  const admin = createAdminClient();

  const trimmed = slug.trim();
  let itemId: string | null = null;
  if (trimmed) {
    const { data: item } = await admin
      .from("items")
      .select("id")
      .eq("slug", trimmed)
      .maybeSingle();
    if (!item) return { ok: false, message: `No item with slug "${trimmed}"` };
    itemId = (item as { id: string }).id;
  }

  const { error } = await admin
    .from("requests")
    .update({ filled_item_id: itemId, status: itemId ? "Covered" : "Requested" })
    .eq("id", id);
  if (error) return { ok: false, message: error.message };
  revalidatePath("/admin");
  revalidatePath("/requests");
  return { ok: true };
}
