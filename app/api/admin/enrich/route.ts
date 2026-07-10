import { type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdminEmail } from "@/lib/admin";
import { fetchEnrichment } from "@/lib/google";
import { enrichmentPatch } from "@/lib/enrichment";
import type { Item } from "@/lib/types";

// Admin-only: refresh Google Places data for one item (by slug).
export async function POST(request: NextRequest) {
  const sb = await createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!isAdminEmail(user?.email)) {
    return Response.json({ ok: false, error: "forbidden" }, { status: 403 });
  }
  if (!process.env.GOOGLE_MAPS_API_KEY) {
    return Response.json({ ok: false, error: "GOOGLE_MAPS_API_KEY not set" }, { status: 503 });
  }

  const body = (await request.json().catch(() => ({}))) as { slug?: string };
  if (!body.slug) {
    return Response.json({ ok: false, error: "slug required" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: item } = await admin
    .from("items")
    .select("id,name,city,country,external_ids,photo_url")
    .eq("slug", body.slug)
    .maybeSingle();
  if (!item) return Response.json({ ok: false, error: "not found" }, { status: 404 });

  const v = item as Pick<Item, "id" | "name" | "city" | "country" | "external_ids" | "photo_url">;
  const fields = await fetchEnrichment(v, new Date().toISOString());
  if (!fields) return Response.json({ ok: false, error: "no Google match" }, { status: 200 });

  const { error } = await admin.from("items").update(enrichmentPatch(v, fields)).eq("id", v.id);
  if (error) return Response.json({ ok: false, error: error.message }, { status: 500 });

  return Response.json({ ok: true });
}
