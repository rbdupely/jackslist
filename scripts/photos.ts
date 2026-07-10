// Backfill item photos from each critic's video thumbnails.
//
//   node --env-file=.env.local scripts/photos.ts           # only items w/o a photo
//   node --env-file=.env.local scripts/photos.ts --force    # overwrite all
//
// Uses each item's top-scoring take's YouTube thumbnail as the display photo.
// Real Google Places photos, once enrichment runs, take precedence over these.

import { createAdminClient } from "../lib/supabase/admin.ts";
import { youtubeThumb } from "../lib/util.ts";

const force = process.argv.slice(2).includes("--force");

async function main() {
  const sb = createAdminClient();

  const { data: items, error } = await sb.from("items").select("id,name,photo_url");
  if (error) throw new Error(error.message);

  const { data: takes, error: tErr } = await sb.from("takes").select("item_id,source_url,score");
  if (tErr) throw new Error(tErr.message);

  // Best (highest-scoring) take with a usable thumbnail, per item.
  const bestThumb = new Map<string, string>();
  const bestScore = new Map<string, number>();
  for (const t of (takes ?? []) as { item_id: string; source_url: string | null; score: number | null }[]) {
    const thumb = youtubeThumb(t.source_url);
    if (!thumb) continue;
    const score = t.score ?? 0;
    if (!bestThumb.has(t.item_id) || score > (bestScore.get(t.item_id) ?? -1)) {
      bestThumb.set(t.item_id, thumb);
      bestScore.set(t.item_id, score);
    }
  }

  let updated = 0;
  let skipped = 0;
  for (const v of (items ?? []) as { id: string; name: string; photo_url: string | null }[]) {
    if (v.photo_url && !force) {
      skipped++;
      continue;
    }
    const thumb = bestThumb.get(v.id);
    if (!thumb) {
      skipped++;
      continue;
    }
    const { error: upErr } = await sb.from("items").update({ photo_url: thumb }).eq("id", v.id);
    if (upErr) throw new Error(`update ${v.name}: ${upErr.message}`);
    updated++;
  }

  console.log(`Done. ${updated} items got a photo, ${skipped} skipped.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
