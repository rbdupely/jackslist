// Seed FOOD with the Michelin Guide as a critic — the world's most authoritative
// restaurant rating — from Wikipedia's CC BY-SA Michelin star lists.
//
//   node --env-file=.env.local scripts/ingest-michelin.ts
//
// Individual food bloggers with structured ratings mostly live on TikTok/YouTube
// or sites that block our crawler. Michelin is the exception institutions can't
// hide: its star awards are public and compiled on Wikipedia with chef + location.
// Stars map to a score (3★ = 10, 2★ = 9), score_original preserves the stars.

import { createAdminClient } from "../lib/supabase/admin.ts";
import { slugify } from "../lib/util.ts";

const UA = "OnlyCritics/1.0 (ryan@dupely.io; contact ryan@dupely.io)";

const TIERS = [
  { page: "List of Michelin 3-star restaurants", stars: 3, score: 10 },
  { page: "List of Michelin 2-star restaurants", stars: 2, score: 9 },
];

const strip = (s: string) =>
  s.replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/&#\d+;/g, " ")
    .replace(/&[a-z]+;/g, " ").replace(/\[\d+\]/g, "").replace(/\s+/g, " ").trim();

function cellMain(cellHtml: string): string {
  const link = cellHtml.match(/<a[^>]*>(.*?)<\/a>/);
  return strip(link ? link[1] : cellHtml).replace(/^["']|["']$/g, "").trim();
}

// City from a Michelin "Location" cell: drop arrondissement + trailing footnotes.
function cityFrom(loc: string): string | null {
  let c = strip(loc).split(",")[0].trim();
  c = c.replace(/\s+\d+(?:er|e|st|nd|rd|th)?$/i, "").trim(); // "Paris 8e" -> "Paris"
  return c || null;
}

async function fetchTables(page: string): Promise<Array<{ headers: string[]; rows: string[][] }>> {
  const url =
    "https://en.wikipedia.org/w/api.php?" +
    new URLSearchParams({ action: "parse", page, prop: "text", format: "json", formatversion: "2" });
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const html = ((await res.json()) as { parse?: { text?: string } }).parse?.text ?? "";
  const tables = html.match(/<table[^>]*wikitable[^>]*>[\s\S]*?<\/table>/g) ?? [];
  return tables.map((t) => {
    const trBlocks = t.split(/<tr[^>]*>/).slice(1);
    let headers: string[] = [];
    const rows: string[][] = [];
    for (const tr of trBlocks) {
      const cells = [...tr.matchAll(/<t([dh])[^>]*>([\s\S]*?)<\/t\1>/g)].map((m) => m[2]);
      if (!cells.length) continue;
      if (!headers.length && /<th/i.test(tr)) headers = cells.map((c) => strip(c).toLowerCase());
      else rows.push(cells);
    }
    return { headers, rows };
  });
}

function col(headers: string[], ...names: string[]): number {
  for (const n of names) {
    const i = headers.findIndex((h) => h.includes(n));
    if (i >= 0) return i;
  }
  return -1;
}

async function main() {
  const sb = createAdminClient();
  const { data: cat } = await sb.from("categories").select("id").eq("slug", "food").maybeSingle();
  if (!cat) throw new Error("food category missing");
  const categoryId = (cat as { id: string }).id;

  await sb.from("critics").upsert(
    {
      slug: "michelin-guide", name: "The Michelin Guide", category_id: categoryId, platform: "Guide",
      source_url: "https://en.wikipedia.org/wiki/Michelin_Guide", score_style: "numeric",
      bio: "The most authoritative restaurant rating in the world. A Michelin star can define a career; three is the summit of fine dining.",
      active: true,
    },
    { onConflict: "slug" },
  );
  const { data: critic } = await sb.from("critics").select("id").eq("slug", "michelin-guide").maybeSingle();
  const criticId = (critic as { id: string }).id;
  await sb.from("takes").delete().eq("critic_id", criticId);

  const seen = new Set<string>();
  let items = 0, takes = 0;

  for (const tier of TIERS) {
    let tables: Array<{ headers: string[]; rows: string[][] }> = [];
    try {
      tables = await fetchTables(tier.page);
    } catch (e) {
      console.log(`  ${tier.stars}★: skipped (${(e as Error).message})`);
      continue;
    }
    let tierTakes = 0;
    for (const { headers, rows } of tables) {
      const ri = col(headers, "restaurant", "name");
      const li = col(headers, "location", "city", "town", "area");
      const ci = col(headers, "chef");
      if (ri < 0 || li < 0) continue; // not a restaurant table
      for (const cells of rows) {
        const name = ri < cells.length ? cellMain(cells[ri]) : "";
        if (!name || name.length < 2) continue;
        const slug = slugify(name);
        if (!slug || seen.has(slug)) continue;
        seen.add(slug);
        const city = li < cells.length ? cityFrom(cells[li]) : null;
        const chef = ci >= 0 && ci < cells.length ? cellMain(cells[ci]) : null;

        const { data: existing } = await sb
          .from("items").select("id").eq("category_id", categoryId).eq("slug", slug).maybeSingle();
        let itemId: string;
        if (existing) {
          itemId = (existing as { id: string }).id;
          if (city) await sb.from("items").update({ city }).eq("id", itemId);
        } else {
          const { data: ins, error } = await sb
            .from("items")
            .insert({ category_id: categoryId, slug, name, city, creator: chef, subtype: "Restaurant" })
            .select("id").single();
          if (error) throw new Error(`item "${name}": ${error.message}`);
          itemId = (ins as { id: string }).id;
          items++;
        }

        const { error } = await sb.from("takes").insert({
          critic_id: criticId, item_id: itemId,
          score: tier.score, score_original: "★".repeat(tier.stars), stance: null,
          source_platform: "Michelin Guide",
          source_title: `${name} — ${tier.stars}-star Michelin`,
          source_url: `https://en.wikipedia.org/wiki/${encodeURIComponent(tier.page.replace(/ /g, "_"))}`,
        });
        if (error) throw new Error(`take "${name}": ${error.message}`);
        takes++;
        tierTakes++;
      }
    }
    console.log(`  ${tier.stars}★ (${tier.page}): ${tierTakes} restaurants`);
    await new Promise((r) => setTimeout(r, 300));
  }

  console.log(`\nDone. ${items} new restaurants, ${takes} Michelin takes.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
