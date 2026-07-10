"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type FollowResult =
  | { ok: true; following: boolean }
  | { ok: false; reason: "auth" | "error" };

// Toggle following a critic. RLS enforces that a user only writes their own row.
export async function toggleFollowAction(criticId: string): Promise<FollowResult> {
  const sb = await createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return { ok: false, reason: "auth" };

  const { data: existing } = await sb
    .from("follows")
    .select("id")
    .eq("critic_id", criticId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (existing) {
    const { error } = await sb.from("follows").delete().eq("id", (existing as { id: string }).id);
    if (error) return { ok: false, reason: "error" };
    revalidatePath("/");
    return { ok: true, following: false };
  }

  const { error } = await sb.from("follows").insert({ critic_id: criticId, user_id: user.id });
  if (error) return { ok: false, reason: "error" };
  revalidatePath("/");
  return { ok: true, following: true };
}
