// Seed MOVIES from the "Critical response" data on Wikipedia film articles.
//
//   node --env-file=.env.local scripts/ingest-wikipedia-movies.ts
//
// Individual film critics (Ebert, Letterboxd, etc.) live behind sources that
// block our crawler. The two figures every film article carries — the Rotten
// Tomatoes Tomatometer and the Metacritic Metascore — are compiled on Wikipedia
// (CC BY-SA) with citations to each aggregator's page. We read those two,
// attribute them, normalize to 0-10, and link back to the real RT / Metacritic
// pages. Two independent aggregators per film means consensus still works.

import { createAdminClient } from "../lib/supabase/admin.ts";
import { slugify } from "../lib/util.ts";
import { normalizeScore } from "../lib/scores.ts";

const UA = "OnlyCritics/1.0 (ryan@dupely.io; contact ryan@dupely.io)";

const CRITICS = [
  {
    slug: "rotten-tomatoes",
    name: "Rotten Tomatoes",
    bio: "The Tomatometer — the share of critics who reviewed a film positively. The industry's most-cited number.",
  },
  {
    slug: "metacritic",
    name: "Metacritic",
    bio: "A weighted average of major critics' scores, 0–100. The more conservative of the two big aggregators.",
  },
];

const FILMS = [
  "Oppenheimer (film)", "Parasite (2019 film)", "Everything Everywhere All at Once",
  "Dune (2021 film)", "Dune: Part Two", "Barbie (film)", "Poor Things (film)",
  "The Batman (film)", "Top Gun: Maverick", "Killers of the Flower Moon (film)",
  "Nomadland", "Get Out", "La La Land", "Moonlight (2016 film)", "Mad Max: Fury Road",
  "Whiplash (2014 film)", "Inception", "The Social Network", "Interstellar (film)",
  "Joker (2019 film)", "1917 (2019 film)", "Once Upon a Time in Hollywood", "The Irishman",
  "Blade Runner 2049", "Arrival (film)", "Spider-Man: Into the Spider-Verse",
  "Spider-Man: Across the Spider-Verse", "The Grand Budapest Hotel", "Gone Girl (film)",
  "Her (film)", "Django Unchained", "The Wolf of Wall Street (2013 film)", "12 Years a Slave (film)",
  "Birdman (film)", "Boyhood (2014 film)", "The Revenant (2015 film)", "Roma (2018 film)",
  "Marriage Story", "Jojo Rabbit", "Knives Out", "Tár", "The Banshees of Inisherin",
  "Anatomy of a Fall", "Past Lives (film)", "The Zone of Interest (film)", "Conclave (film)",
  "Wicked (2024 film)", "The Substance", "A Complete Unknown", "Nickel Boys (film)",
];

async function fetchHtml(title: string): Promise<string> {
  const url =
    "https://en.wikipedia.org/w/api.php?" +
    new URLSearchParams({ action: "parse", page: title, prop: "text", format: "json", formatversion: "2" });
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = (await res.json()) as { parse?: { text?: string } };
  return json.parse?.text ?? "";
}

const plain = (h: string) =>
  h.replace(/<[^>]+>/g, " ").replace(/&#\d+;/g, " ").replace(/&[a-z]+;/g, " ").replace(/\s+/g, " ");

function firstHref(html: string, host: string): string | null {
  const m = html.match(new RegExp(`href="(https?://[^"]*${host.replace(".", "\\.")}[^"]*)"`, "i"));
  return m ? m[1].replace(/&amp;/g, "&") : null;
}

function director(html: string): string | null {
  const row = html.match(/Directed by<\/th>\s*<td[^>]*>([\s\S]*?)<\/td>/i);
  if (!row) return null;
  const links = [...row[1].matchAll(/<a[^>]*>([^<]+)<\/a>/g)].map((m) => m[1].trim());
  if (links.length) return links.join(", ");
  return row[1].replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim() || null;
}

function cleanTitle(title: string): { name: string; year: number | null } {
  const y = title.match(/\((\d{4})\s+film\)$/);
  const name = title.replace(/\s*\((?:\d{4}\s+)?film\)$/i, "").trim();
  return { name, year: y ? Number(y[1]) : null };
}

async function main() {
  const sb = createAdminClient();
  const { data: cat } = await sb.from("categories").select("id").eq("slug", "movies").maybeSingle();
  if (!cat) throw new Error("movies category missing — run migration 0001");
  const categoryId = (cat as { id: string }).id;

  const criticId = new Map<string, string>();
  for (const c of CRITICS) {
    await sb.from("critics").upsert(
      {
        slug: c.slug, name: c.name, category_id: categoryId, platform: "Aggregator",
        source_url: `https://en.wikipedia.org/wiki/${c.slug === "metacritic" ? "Metacritic" : "Rotten_Tomatoes"}`,
        bio: c.bio, score_style: "numeric", active: true,
      },
      { onConflict: "slug" },
    );
    const { data: row } = await sb.from("critics").select("id").eq("slug", c.slug).maybeSingle();
    criticId.set(c.slug, (row as { id: string }).id);
  }
  await sb.from("takes").delete().in("critic_id", [...criticId.values()]);

  let newItems = 0, totalTakes = 0, skipped = 0;

  for (const title of FILMS) {
    let html = "";
    try {
      html = await fetchHtml(title);
    } catch (e) {
      console.log(`  ✗ ${title}: ${(e as Error).message}`);
      skipped++;
      continue;
    }
    const text = plain(html);
    const rtPct =
      text.match(/Rotten Tomatoes[^.]{0,140}?(\d{1,3})%/)?.[1] ??
      text.match(/(\d{1,3})%[^.]{0,80}?Rotten Tomatoes/)?.[1] ?? null;
    const mc = text.match(/Metacritic[^.]{0,180}?(\d{2,3})\s*(?:out of|\/)\s*100/i)?.[1] ?? null;

    if (!rtPct && !mc) {
      console.log(`  – ${title}: no RT/Metacritic figures`);
      skipped++;
      continue;
    }

    const { name, year } = cleanTitle(title);
    const slug = slugify(name);
    const wikiUrl = `https://en.wikipedia.org/wiki/${encodeURIComponent(title.replace(/ /g, "_"))}`;
    const dir = director(html);

    const { data: existing } = await sb
      .from("items").select("id").eq("category_id", categoryId).eq("slug", slug).maybeSingle();
    let itemId: string;
    if (existing) {
      itemId = (existing as { id: string }).id;
      await sb.from("items").update({ creator: dir, year }).eq("id", itemId);
    } else {
      const { data: ins, error } = await sb
        .from("items")
        .insert({ category_id: categoryId, slug, name, creator: dir, year, subtype: "Film" })
        .select("id").single();
      if (error) throw new Error(`item "${name}": ${error.message}`);
      itemId = (ins as { id: string }).id;
      newItems++;
    }

    const rows: Array<{ slug: string; original: string; url: string | null }> = [];
    if (rtPct) rows.push({ slug: "rotten-tomatoes", original: `${rtPct}%`, url: firstHref(html, "rottentomatoes.com") });
    if (mc) rows.push({ slug: "metacritic", original: `${mc}/100`, url: firstHref(html, "metacritic.com") });

    for (const r of rows) {
      const { error } = await sb.from("takes").insert({
        critic_id: criticId.get(r.slug)!, item_id: itemId,
        score: normalizeScore(r.original), score_original: r.original, stance: null,
        source_platform: r.slug === "metacritic" ? "Metacritic" : "Rotten Tomatoes",
        source_title: `${name} on ${r.slug === "metacritic" ? "Metacritic" : "Rotten Tomatoes"}`,
        source_url: r.url ?? wikiUrl,
      });
      if (error) throw new Error(`take ${r.slug}/${name}: ${error.message}`);
      totalTakes++;
    }
    console.log(`  ✓ ${name}${year ? ` (${year})` : ""}: RT ${rtPct ?? "—"} · MC ${mc ?? "—"}${dir ? ` · dir. ${dir}` : ""}`);
    await new Promise((r) => setTimeout(r, 300));
  }

  console.log(`\nDone. ${newItems} new films, ${totalTakes} takes, ${skipped} skipped.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
