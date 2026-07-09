// Seed venues + mentions from data/recommendations.csv.
//
//   node --env-file=.env.local scripts/seed.ts
//
// Requires SUPABASE_SERVICE_ROLE_KEY (bypasses RLS). Idempotent: clears
// mentions + venues first, then re-inserts. Skips rows with no business name.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { createAdminClient } from "../lib/supabase/admin.ts";
import { normalizeCategory } from "../lib/categories.ts";
import { slugify, parseTimestampToSeconds } from "../lib/util.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CSV_PATH = join(__dirname, "..", "data", "recommendations.csv");

// ---- CSV parsing (RFC-4180: quoted fields, "" escapes, newlines in quotes) --
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let field = "";
  let row: string[] = [];
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (c === "\r") {
      // ignore; handled by \n
    } else {
      field += c;
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

function toRecords(text: string): Record<string, string>[] {
  const rows = parseCsv(text).filter((r) => r.some((c) => c.trim() !== ""));
  const header = rows[0].map((h) => h.trim());
  return rows.slice(1).map((r) => {
    const rec: Record<string, string> = {};
    header.forEach((h, i) => (rec[h] = (r[i] ?? "").trim()));
    return rec;
  });
}

function firstNonEmpty(rows: Record<string, string>[], key: string): string | null {
  for (const r of rows) if (r[key]) return r[key];
  return null;
}

function mode(values: string[]): string | null {
  const counts = new Map<string, number>();
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1);
  let best: string | null = null;
  let bestN = 0;
  for (const [v, n] of counts) {
    if (n > bestN) {
      best = v;
      bestN = n;
    }
  }
  return best;
}

function parseDate(s: string | null): string | null {
  if (!s) return null;
  const m = s.match(/\d{4}-\d{2}-\d{2}/);
  return m ? m[0] : null;
}

function parseNum(s: string | null): number | null {
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

async function main() {
  const text = readFileSync(CSV_PATH, "utf-8");
  const records = toRecords(text);
  console.log(`Read ${records.length} rows from CSV`);

  const named = records.filter((r) => r["business_name"]);
  console.log(`${records.length - named.length} rows skipped (no business name)`);

  // Group by normalized (lowercased) business name.
  const groups = new Map<string, Record<string, string>[]>();
  for (const r of named) {
    const key = r["business_name"].toLowerCase();
    const arr = groups.get(key);
    if (arr) arr.push(r);
    else groups.set(key, [r]);
  }
  console.log(`${groups.size} unique venues`);

  // Build venue rows with unique slugs.
  const usedSlugs = new Set<string>();
  type VenueSeed = { key: string; row: Record<string, unknown>; rows: Record<string, string>[] };
  const venueSeeds: VenueSeed[] = [];

  for (const [key, rows] of groups) {
    const name = rows[0]["business_name"];
    const city = firstNonEmpty(rows, "city_metro");
    const category = mode(rows.map((r) => normalizeCategory(r["category"])))!;

    let slug = slugify(name);
    if (!slug) slug = `venue-${venueSeeds.length + 1}`;
    if (usedSlugs.has(slug)) {
      const citied = city ? `${slug}-${slugify(city)}` : slug;
      slug = citied;
      let n = 2;
      while (usedSlugs.has(slug)) slug = `${citied}-${n++}`;
    }
    usedSlugs.add(slug);

    const scores = rows.map((r) => parseNum(r["score_0_10"])).filter((n): n is number => n != null);
    const jackScore = scores.length ? Math.max(...scores) : null;

    // Fallback blurb: the verdict from the highest-scoring mention. Phase 4
    // (scripts/blurbs.ts) can overwrite this with an LLM-written blurb.
    const best = [...rows].sort(
      (a, b) => (parseNum(b["score_0_10"]) ?? 0) - (parseNum(a["score_0_10"]) ?? 0),
    )[0];
    const blurb = best["jacks_verdict"] || null;

    venueSeeds.push({
      key,
      rows,
      row: {
        name,
        slug,
        category,
        cuisine_type: firstNonEmpty(rows, "cuisine_type"),
        city,
        neighborhood: firstNonEmpty(rows, "neighborhood"),
        country: firstNonEmpty(rows, "country"),
        price_tier: firstNonEmpty(rows, "price_tier"),
        jack_score: jackScore,
        mention_count: rows.length,
        jack_blurb: blurb,
      },
    });
  }

  const sb = createAdminClient();

  // Clear existing data (mentions first due to FK).
  console.log("Clearing existing mentions + venues…");
  await sb.from("mentions").delete().not("id", "is", null);
  await sb.from("venues").delete().not("id", "is", null);

  // Insert venues in batches, collecting slug -> id.
  const slugToId = new Map<string, string>();
  const venueRows = venueSeeds.map((v) => v.row);
  for (let i = 0; i < venueRows.length; i += 200) {
    const batch = venueRows.slice(i, i + 200);
    const { data, error } = await sb.from("venues").insert(batch).select("id,slug");
    if (error) throw new Error(`venue insert failed: ${error.message}`);
    for (const v of data as { id: string; slug: string }[]) slugToId.set(v.slug, v.id);
    console.log(`  inserted venues ${i + 1}–${i + batch.length}`);
  }

  // Build mention rows.
  const mentionRows: Record<string, unknown>[] = [];
  for (const seed of venueSeeds) {
    const venueId = slugToId.get(seed.row.slug as string);
    if (!venueId) continue;
    for (const r of seed.rows) {
      mentionRows.push({
        venue_id: venueId,
        rec_id: r["rec_id"] || null,
        verdict: r["jacks_verdict"] || null,
        sentiment: r["sentiment"] || null,
        dishes_called_out: r["dishes_called_out"] || null,
        must_order: r["must_order"] || null,
        superlatives: r["superlatives"] || null,
        best_of_language: /^yes$/i.test(r["best_of_language"] || ""),
        source_platform: r["platform"] || null,
        source_title: r["source_title"] || null,
        source_url: r["source_url"] || null,
        timestamp_sec: parseTimestampToSeconds(r["timestamp"]),
        timestamp_label: r["timestamp"] || null,
        publish_date: parseDate(r["publish_date"]),
        score: parseNum(r["score_0_10"]),
      });
    }
  }

  for (let i = 0; i < mentionRows.length; i += 300) {
    const batch = mentionRows.slice(i, i + 300);
    const { error } = await sb.from("mentions").insert(batch);
    if (error) throw new Error(`mention insert failed: ${error.message}`);
    console.log(`  inserted mentions ${i + 1}–${i + batch.length}`);
  }

  console.log(
    `\nDone. ${venueRows.length} venues, ${mentionRows.length} mentions seeded.`,
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
