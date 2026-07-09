// Backfill venue photos from Jack's video thumbnails.
//
//   node --env-file=.env.local scripts/photos.ts           # only venues w/o a photo
//   node --env-file=.env.local scripts/photos.ts --force    # overwrite all
//
// Uses each venue's top mention (highest score) YouTube thumbnail as the display
// photo. Stored in venues.google_photo_url, which the UI already renders — so
// cards and venue heroes fill immediately, local + prod (same DB). Real Google
// Places photos, once enrichment runs, take precedence over these.

import { createAdminClient } from "../lib/supabase/admin.ts";
import { youtubeThumb } from "../lib/util.ts";

const force = process.argv.slice(2).includes("--force");

async function main() {
  const sb = createAdminClient();

  const { data: venues, error } = await sb
    .from("venues")
    .select("id,name,google_photo_url");
  if (error) throw new Error(error.message);

  const { data: mentions, error: mErr } = await sb
    .from("mentions")
    .select("venue_id,source_url,score");
  if (mErr) throw new Error(mErr.message);

  // Best (highest-scoring) mention with a usable thumbnail, per venue.
  const bestThumb = new Map<string, string>();
  const bestScore = new Map<string, number>();
  for (const m of (mentions ?? []) as { venue_id: string; source_url: string | null; score: number | null }[]) {
    const thumb = youtubeThumb(m.source_url);
    if (!thumb) continue;
    const score = m.score ?? 0;
    if (!bestThumb.has(m.venue_id) || score > (bestScore.get(m.venue_id) ?? -1)) {
      bestThumb.set(m.venue_id, thumb);
      bestScore.set(m.venue_id, score);
    }
  }

  let updated = 0;
  let skipped = 0;
  for (const v of (venues ?? []) as { id: string; name: string; google_photo_url: string | null }[]) {
    if (v.google_photo_url && !force) {
      skipped++;
      continue;
    }
    const thumb = bestThumb.get(v.id);
    if (!thumb) {
      skipped++;
      continue;
    }
    const { error: upErr } = await sb
      .from("venues")
      .update({ google_photo_url: thumb })
      .eq("id", v.id);
    if (upErr) throw new Error(`update ${v.name}: ${upErr.message}`);
    updated++;
  }

  console.log(`Done. ${updated} venues got a photo, ${skipped} skipped.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
