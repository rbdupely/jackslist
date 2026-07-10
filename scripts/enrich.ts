// Enrich food items with Google Places data (address, coords, rating, photo, map).
//
//   node --env-file=.env.local scripts/enrich.ts            # only un-enriched
//   node --env-file=.env.local scripts/enrich.ts --force    # re-enrich all
//   node --env-file=.env.local scripts/enrich.ts --limit 20 # cap for testing
//
// Requires GOOGLE_MAPS_API_KEY + SUPABASE_SERVICE_ROLE_KEY. Caches results in
// the DB so pages never call Google at request time. No-match => fields stay
// null and the item still renders.

import { createAdminClient } from "../lib/supabase/admin.ts";
import { fetchEnrichment } from "../lib/google.ts";
import { enrichmentPatch } from "../lib/enrichment.ts";

const args = process.argv.slice(2);
const force = args.includes("--force");
const limitArg = args.indexOf("--limit");
const limit = limitArg >= 0 ? parseInt(args[limitArg + 1] ?? "0", 10) : 0;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function main() {
  if (!process.env.GOOGLE_MAPS_API_KEY) {
    throw new Error("GOOGLE_MAPS_API_KEY not set — add it to .env.local first.");
  }
  const sb = createAdminClient();

  const { data: cat } = await sb.from("categories").select("id").eq("slug", "food").maybeSingle();
  if (!cat) throw new Error("food category missing — run migration 0001 first");

  const { data, error } = await sb
    .from("items")
    .select("id,name,city,country,external_ids,photo_url")
    .eq("category_id", (cat as { id: string }).id);
  if (error) throw new Error(error.message);

  let items = (data ?? []) as {
    id: string;
    name: string;
    city: string | null;
    country: string | null;
    external_ids: Record<string, string> | null;
    photo_url: string | null;
  }[];

  if (!force) items = items.filter((v) => !v.external_ids?.google_place_id);
  if (limit > 0) items = items.slice(0, limit);

  console.log(`Enriching ${items.length} items${force ? " (force)" : ""}…`);

  let matched = 0;
  let unmatched = 0;
  for (const v of items) {
    try {
      const fields = await fetchEnrichment(v, new Date().toISOString());
      if (!fields) {
        unmatched++;
        console.log(`  ✗ no match: ${v.name}`);
      } else {
        const { error: upErr } = await sb.from("items").update(enrichmentPatch(v, fields)).eq("id", v.id);
        if (upErr) throw upErr;
        matched++;
        console.log(`  ✓ ${v.name}`);
      }
    } catch (e) {
      unmatched++;
      console.log(`  ! error for ${v.name}: ${(e as Error).message}`);
    }
    await sleep(150); // stay well under QPS limits
  }

  console.log(`\nDone. ${matched} matched, ${unmatched} unmatched.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
