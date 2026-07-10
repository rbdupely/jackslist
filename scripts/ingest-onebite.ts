// Ingest Dave Portnoy's real One Bite pizza reviews into items + takes.
//
//   node --env-file=.env.local scripts/ingest-onebite.ts               # full catalog
//   node --env-file=.env.local scripts/ingest-onebite.ts --max-pages 3 # quick test
//
// One Bite is Portnoy's own platform — the primary source of his scored reviews.
// Its robots.txt has no AI block and it publishes sitemaps (an invitation to
// index). We paginate /reviews/dave?page=N, the site's own pagination.
//
// Each review's text field is essentially empty — the review IS the 0-10 score
// plus the video, like a 13F is the disclosure. So we store his real score and
// a link to his actual review, and invent no words.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { createAdminClient } from "../lib/supabase/admin.ts";
import { slugify } from "../lib/util.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const UA = "OnlyCritics/1.0 (ryan@dupely.io; contact ryan@dupely.io)";

const args = process.argv.slice(2);
const mpArg = args.indexOf("--max-pages");
const MAX_PAGES = mpArg >= 0 ? parseInt(args[mpArg + 1] ?? "100", 10) : 100;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

type Review = {
  id: string;
  score: number | null;
  date?: string;
  title?: string | null;
  media?: { thumbnails?: Record<string, string> } | null;
  venue?: {
    name?: string;
    slug?: string;
    city?: string;
    state?: string;
    country?: string;
    address1?: string;
    loc?: { coordinates?: [number, number] } | null;
    reviewStats?: { all?: { averageScore?: number; count?: number } } | null;
  } | null;
};

async function fetchPage(page: number): Promise<Review[]> {
  const res = await fetch(`https://onebite.app/reviews/dave?page=${page}`, {
    headers: { "User-Agent": UA },
  });
  if (!res.ok) throw new Error(`onebite HTTP ${res.status} on page ${page}`);
  const html = await res.text();
  const m = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
  if (!m) throw new Error(`no __NEXT_DATA__ on page ${page}`);
  const data = JSON.parse(m[1]) as { props: { pageProps: { reviews?: Review[] } } };
  return data.props.pageProps.reviews ?? [];
}

function stanceFor(score: number): string {
  if (score >= 8) return "rave";
  if (score >= 6.5) return "positive";
  if (score >= 4.5) return "mixed";
  return "negative";
}

async function main() {
  const registry = JSON.parse(
    readFileSync(join(__dirname, "..", "data", "critics.json"), "utf-8"),
  ) as Record<string, { name: string; category: string; platform?: string; source_url?: string; bio?: string; score_style?: string }>;
  const meta = registry["dave-portnoy"];
  if (!meta) throw new Error("dave-portnoy missing from data/critics.json");

  const sb = createAdminClient();
  const { data: cat } = await sb.from("categories").select("id").eq("slug", "food").maybeSingle();
  if (!cat) throw new Error("food category missing — run migration 0001");
  const categoryId = (cat as { id: string }).id;

  await sb.from("critics").upsert(
    {
      slug: "dave-portnoy",
      name: meta.name,
      category_id: categoryId,
      platform: meta.platform ?? "One Bite",
      source_url: "https://onebite.app/reviews/dave",
      bio: meta.bio ?? null,
      score_style: "numeric",
      active: true,
    },
    { onConflict: "slug" },
  );
  const { data: critic } = await sb.from("critics").select("id").eq("slug", "dave-portnoy").maybeSingle();
  const criticId = (critic as { id: string }).id;

  await sb.from("takes").delete().eq("critic_id", criticId); // idempotent

  let newItems = 0;
  let takes = 0;
  let overlaps = 0;
  const seen = new Set<string>(); // dedupe repeat reviews of the same venue

  for (let page = 1; page <= MAX_PAGES; page++) {
    const reviews = await fetchPage(page);
    if (reviews.length === 0) {
      console.log(`  page ${page}: empty — stopping.`);
      break;
    }

    for (const r of reviews) {
      const v = r.venue;
      if (!v?.name || r.score == null) continue;
      const slug = slugify(v.name);
      if (!slug || seen.has(slug)) continue; // one take per venue (his latest)
      seen.add(slug);

      const coords = v.loc?.coordinates;
      const thumb = r.media?.thumbnails?.medium ?? r.media?.thumbnails?.small ?? null;
      const crowd = v.reviewStats?.all;

      const { data: existing } = await sb
        .from("items")
        .select("id,photo_url,crowd_score")
        .eq("category_id", categoryId)
        .eq("slug", slug)
        .maybeSingle();

      let itemId: string;
      if (existing) {
        overlaps++; // an item that already existed (likely a Jack venue)
        itemId = (existing as { id: string }).id;
        const patch: Record<string, unknown> = {};
        if (!(existing as { photo_url: string | null }).photo_url && thumb) patch.photo_url = thumb;
        if ((existing as { crowd_score: number | null }).crowd_score == null && crowd?.averageScore != null) {
          patch.crowd_score = Math.round(crowd.averageScore * 10) / 10;
          patch.crowd_scale = "0-10";
          patch.crowd_source = "One Bite community";
          patch.crowd_url = `https://onebite.app/restaurant/${v.slug}`;
        }
        if (Object.keys(patch).length) await sb.from("items").update(patch).eq("id", itemId);
      } else {
        const { data: ins, error } = await sb
          .from("items")
          .insert({
            category_id: categoryId,
            slug,
            name: v.name,
            subtype: "Pizza",
            city: v.city ?? null,
            country: v.country ?? null,
            address: v.address1 ?? null,
            lat: coords ? coords[1] : null,
            lng: coords ? coords[0] : null,
            photo_url: thumb,
            metadata: { cuisine: "Pizza" },
            crowd_score: crowd?.averageScore != null ? Math.round(crowd.averageScore * 10) / 10 : null,
            crowd_scale: crowd?.averageScore != null ? "0-10" : null,
            crowd_source: crowd?.averageScore != null ? "One Bite community" : null,
            crowd_url: crowd?.averageScore != null ? `https://onebite.app/restaurant/${v.slug}` : null,
          })
          .select("id")
          .single();
        if (error) throw new Error(`item "${v.name}": ${error.message}`);
        itemId = (ins as { id: string }).id;
        newItems++;
      }

      const { error: tErr } = await sb.from("takes").insert({
        critic_id: criticId,
        item_id: itemId,
        verdict: null, // the score + video is the review; no text to quote
        score: r.score,
        score_original: `${r.score}/10`,
        stance: stanceFor(r.score),
        source_platform: "One Bite",
        source_title: `${v.name} — Dave Portnoy's One Bite review`,
        source_url: `https://onebite.app/restaurant/${v.slug}/review/${r.id}`,
        published_on: r.date ? r.date.slice(0, 10) : null,
      });
      if (tErr) throw new Error(`take for ${v.name}: ${tErr.message}`);
      takes++;
    }

    console.log(`  page ${page}: ${reviews.length} reviews (running: ${takes} takes, ${newItems} new items, ${overlaps} on existing)`);
    await sleep(200); // polite
  }

  console.log(`\nDone. ${takes} Portnoy takes, ${newItems} new pizza items, ${overlaps} landed on pre-existing items.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
