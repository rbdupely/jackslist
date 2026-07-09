"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { normalizedKey, type ParsedQuery } from "@/lib/curate";

export type RequestState = {
  id: string;
  upvotes: number;
  status: string;
  alreadyVoted: boolean;
};

// Record a zero-result search as a request (create, or bump if it exists).
// Returns the request so the client can render its live upvote count.
export async function recordRequestAction(parsed: ParsedQuery): Promise<RequestState | null> {
  const key = normalizedKey(parsed);
  if (!key.replace(/\|/g, "").trim()) return null; // nothing meaningful to record

  const sb = await createClient();
  const { data, error } = await sb
    .rpc("record_request", {
      p_key: key,
      p_query: parsed.raw,
      p_city: parsed.city,
      p_category: parsed.category,
      p_cuisine: parsed.cuisine,
    })
    .maybeSingle();

  if (error || !data) {
    console.error("recordRequestAction", error);
    return null;
  }

  const row = data as { id: string; upvotes: number; status: string };
  const { data: userData } = await sb.auth.getUser();
  let alreadyVoted = false;
  if (userData.user) {
    const { data: vote } = await sb
      .from("request_votes")
      .select("id")
      .eq("request_id", row.id)
      .eq("user_id", userData.user.id)
      .maybeSingle();
    alreadyVoted = !!vote;
  }

  return { id: row.id, upvotes: row.upvotes, status: row.status, alreadyVoted };
}

export type UpvoteResult =
  | { ok: true; upvotes: number; counted: boolean }
  | { ok: false; reason: "auth" | "error" };

// Cast a logged-in upvote (one per user, enforced in the DB).
export async function upvoteRequestAction(requestId: string): Promise<UpvoteResult> {
  const sb = await createClient();
  const { data: userData } = await sb.auth.getUser();
  if (!userData.user) return { ok: false, reason: "auth" };

  const { data, error } = await sb
    .rpc("upvote_request", { p_request_id: requestId })
    .maybeSingle();

  if (error || !data) {
    console.error("upvoteRequestAction", error);
    return { ok: false, reason: "error" };
  }

  const row = data as { upvotes: number; counted: boolean };
  revalidatePath("/requests");
  return { ok: true, upvotes: row.upvotes, counted: row.counted };
}
