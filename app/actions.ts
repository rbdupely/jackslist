"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requestQualifier, requestSubject, type ParsedQuery } from "@/lib/curate";

export type RequestState = {
  id: string;
  upvotes: number;
  status: string;
  alreadyVoted: boolean;
};

// Record a zero-result search as a request (create, or bump if it exists).
// Keyed on category|subject|qualifier, so the loop works in every category.
export async function recordRequestAction(
  parsed: ParsedQuery,
  categorySlug = "food",
): Promise<RequestState | null> {
  const subject = requestSubject(parsed);
  if (!subject) return null; // nothing meaningful to record

  const sb = await createClient();
  const { data, error } = await sb
    .rpc("record_request_v2", {
      p_category_slug: categorySlug,
      p_subject: subject,
      p_qualifier: requestQualifier(parsed),
      p_query: parsed.raw,
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
