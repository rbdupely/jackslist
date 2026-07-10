// Seed one critic's real, sourced takes from a CSV into items + takes.
//
//   node --env-file=.env.local scripts/seed-critic.ts <critic-slug>
//
// Reads the critic's identity from data/critics.json and their takes from
// data/<critic-slug>.csv. Idempotent per critic: replaces that critic's takes,
// dedupes items by (category, slug), and never touches other critics' data.
//
// EVERY ROW MUST BE REAL. This tool does not invent data — it maps a CSV you
// curated from real, citable sources (verdict <= 30 words, a resolving
// source_url, a date). See data/TEMPLATE.csv for the columns.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { createAdminClient } from "../lib/supabase/admin.ts";
import { slugify } from "../lib/util.ts";
import { normalizeScore } from "../lib/scores.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA = join(__dirname, "..", "data");

const criticSlug = process.argv[2];
if (!criticSlug) {
  console.error("usage: node --env-file=.env.local scripts/seed-critic.ts <critic-slug>");
  process.exit(1);
}

// ---- CSV parsing (RFC-4180) -----------------------------------------------
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let field = "", row: string[] = [], inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; } else inQuotes = false;
      } else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\n") { row.push(field); rows.push(row); row = []; field = ""; }
    else if (c !== "\r") field += c;
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  return rows;
}

function records(text: string): Record<string, string>[] {
  const rows = parseCsv(text).filter((r) => r.some((c) => c.trim() !== ""));
  const header = rows[0].map((h) => h.trim());
  return rows.slice(1).map((r) => {
    const rec: Record<string, string> = {};
    header.forEach((h, i) => (rec[h] = (r[i] ?? "").trim()));
    return rec;
  });
}

const nn = (s: string | undefined) => (s && s.trim() ? s.trim() : null);
const num = (s: string | undefined) => {
  const n = Number(s);
  return s && Number.isFinite(n) ? n : null;
};

async function main() {
  const registry = JSON.parse(readFileSync(join(DATA, "critics.json"), "utf-8")) as Record<
    string,
    { name: string; category: string; platform?: string; source_url?: string; bio?: string; score_style?: string; avatar_url?: string }
  >;
  const meta = registry[criticSlug];
  if (!meta) throw new Error(`No identity for "${criticSlug}" in data/critics.json`);

  let csv: string;
  try {
    csv = readFileSync(join(DATA, `${criticSlug}.csv`), "utf-8");
  } catch {
    throw new Error(`No data/${criticSlug}.csv found. Curate real takes first (see data/TEMPLATE.csv).`);
  }
  const rows = records(csv);
  if (!rows.length) throw new Error(`data/${criticSlug}.csv has no rows`);

  const sb = createAdminClient();

  const { data: cat } = await sb.from("categories").select("id").eq("slug", meta.category).maybeSingle();
  if (!cat) throw new Error(`Unknown category "${meta.category}" for ${criticSlug}`);
  const categoryId = (cat as { id: string }).id;

  // Upsert critic identity.
  await sb.from("critics").upsert(
    {
      slug: criticSlug,
      name: meta.name,
      category_id: categoryId,
      platform: meta.platform ?? null,
      source_url: meta.source_url ?? null,
      avatar_url: meta.avatar_url ?? null,
      bio: meta.bio ?? null,
      score_style: meta.score_style === "stance" ? "stance" : "numeric",
      active: true,
    },
    { onConflict: "slug" },
  );
  const { data: critic } = await sb.from("critics").select("id").eq("slug", criticSlug).maybeSingle();
  const criticId = (critic as { id: string }).id;

  // Idempotent: clear this critic's takes only.
  await sb.from("takes").delete().eq("critic_id", criticId);

  let items = 0, takes = 0;
  const takeRows: Record<string, unknown>[] = [];

  for (const r of rows) {
    const name = nn(r.item_name);
    if (!name) continue;
    const slug = slugify(name);

    // Upsert the item within this category.
    const { data: existing } = await sb
      .from("items").select("id,metadata,crowd_score")
      .eq("category_id", categoryId).eq("slug", slug).maybeSingle();

    const crowdScore = num(r.crowd_score);
    let itemId: string;
    if (existing) {
      itemId = (existing as { id: string }).id;
      if (crowdScore != null) {
        await sb.from("items").update({
          crowd_score: crowdScore, crowd_scale: nn(r.crowd_scale), crowd_source: nn(r.crowd_source), crowd_url: nn(r.crowd_url),
        }).eq("id", itemId);
      }
    } else {
      const externalIds: Record<string, string> = {};
      if (nn(r.external_id_key) && nn(r.external_id_val)) externalIds[r.external_id_key.trim()] = r.external_id_val.trim();
      const { data: ins, error } = await sb.from("items").insert({
        category_id: categoryId, slug, name,
        subtype: nn(r.subtype), creator: nn(r.creator), year: num(r.year),
        city: nn(r.city), country: nn(r.country),
        external_ids: externalIds,
        crowd_score: crowdScore, crowd_scale: nn(r.crowd_scale), crowd_source: nn(r.crowd_source), crowd_url: nn(r.crowd_url),
      }).select("id").single();
      if (error) throw new Error(`item "${name}": ${error.message}`);
      itemId = (ins as { id: string }).id;
      items++;
    }

    // Normalize the score: explicit `score` wins, else parse `score_original`.
    const score = num(r.score) ?? (meta.score_style === "stance" ? null : normalizeScore(r.score_original));

    takeRows.push({
      critic_id: criticId,
      item_id: itemId,
      verdict: nn(r.verdict),
      score,
      score_original: nn(r.score_original),
      stance: nn(r.stance),
      highlights: nn(r.highlights),
      best_of_language: /^(yes|true|1)$/i.test(r.best_of ?? ""),
      source_platform: nn(r.source_platform) ?? meta.platform ?? null,
      source_title: nn(r.source_title),
      source_url: nn(r.source_url),
      timestamp_sec: num(r.timestamp_sec),
      published_on: nn(r.published_on),
    });
    takes++;
  }

  for (let i = 0; i < takeRows.length; i += 200) {
    const { error } = await sb.from("takes").insert(takeRows.slice(i, i + 200));
    if (error) throw new Error(`takes insert: ${error.message}`);
  }

  console.log(`${meta.name}: ${items} new items, ${takes} takes.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
