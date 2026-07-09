// Enrich venues with Google Places data (address, coords, rating, photo, map).
//
//   node --env-file=.env.local scripts/enrich.ts            # only un-enriched
//   node --env-file=.env.local scripts/enrich.ts --force    # re-enrich all
//   node --env-file=.env.local scripts/enrich.ts --limit 20 # cap for testing
//
// Requires GOOGLE_MAPS_API_KEY + SUPABASE_SERVICE_ROLE_KEY. Caches results in
// the DB so pages never call Google at request time. No-match => fields stay
// null and the venue still renders.

import { createAdminClient } from "../lib/supabase/admin.ts";
import { fetchEnrichment } from "../lib/google.ts";

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

  const { data, error } = await sb
    .from("venues")
    .select("id,name,slug,city,country,google_place_id")
    .order("mention_count", { ascending: false });
  if (error) throw new Error(error.message);

  let venues = (data ?? []) as {
    id: string;
    name: string;
    slug: string;
    city: string | null;
    country: string | null;
    google_place_id: string | null;
  }[];

  if (!force) venues = venues.filter((v) => !v.google_place_id);
  if (limit > 0) venues = venues.slice(0, limit);

  console.log(`Enriching ${venues.length} venues${force ? " (force)" : ""}…`);

  let matched = 0;
  let unmatched = 0;
  for (const v of venues) {
    try {
      const fields = await fetchEnrichment(v, new Date().toISOString());
      if (!fields) {
        unmatched++;
        console.log(`  ✗ no match: ${v.name}`);
      } else {
        // Don't clobber an existing photo (e.g. the video-thumbnail fallback)
        // when Google has no photo for this place.
        const patch: Record<string, unknown> = { ...fields };
        if (patch.google_photo_url == null) delete patch.google_photo_url;
        const { error: upErr } = await sb.from("venues").update(patch).eq("id", v.id);
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
