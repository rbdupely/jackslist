// Generate critic-voice blurbs for each item from its takes, via the Anthropic
// API (no SDK — plain fetch). Written into items.metadata.blurb.
//
//   node --env-file=.env.local scripts/blurbs.ts             # all items
//   node --env-file=.env.local scripts/blurbs.ts --limit 10  # test a few
//
// Requires ANTHROPIC_API_KEY + SUPABASE_SERVICE_ROLE_KEY.

import { createAdminClient } from "../lib/supabase/admin.ts";

const MODEL = process.env.ANTHROPIC_MODEL || "claude-haiku-4-5-20251001";

const SYSTEM = `You write one-line blurbs for OnlyCritics, a discovery site where every recommendation comes from a named individual critic rather than an aggregate score.

Voice: punchy, confident, casual, hype but earned. Short declaratives. Superlative-driven but specific. Name the thing to get. Present tense. No corporate copy, no hedging.

Rules:
- 1–2 sentences, max ~240 characters.
- Use ONLY facts present in the provided notes. Never invent dishes, awards, or claims.
- If a must-order highlight is given, name it.
- Output ONLY the blurb text — no quotes, no preamble.`;

const args = process.argv.slice(2);
const limitArg = args.indexOf("--limit");
const limit = limitArg >= 0 ? parseInt(args[limitArg + 1] ?? "0", 10) : 0;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

type TakeLite = {
  verdict: string | null;
  superlatives: string | null;
  highlights: string | null;
  score: number | null;
  best_of_language: boolean | null;
};

type ItemLite = {
  id: string;
  name: string;
  subtype: string | null;
  city: string | null;
  price_tier: string | null;
  metadata: Record<string, string> | null;
};

function buildNotes(v: ItemLite, takes: TakeLite[]): string {
  const lines = [
    `Item: ${v.name}`,
    `Type: ${v.subtype ?? "—"}${v.metadata?.cuisine ? ` (${v.metadata.cuisine})` : ""}`,
    `City: ${v.city ?? "—"}`,
    v.price_tier ? `Price: ${v.price_tier}` : "",
    "",
    "Critic's takes:",
  ];
  for (const m of takes.slice(0, 6)) {
    const bits = [
      m.verdict,
      m.highlights ? `Highlight: ${m.highlights}` : "",
      m.superlatives ? `Superlatives: ${m.superlatives}` : "",
      m.best_of_language ? "(called a best-of)" : "",
      m.score != null ? `[score ${m.score}/10]` : "",
    ].filter(Boolean);
    lines.push(`- ${bits.join(" — ")}`);
  }
  return lines.join("\n");
}

async function generateBlurb(notes: string): Promise<string | null> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": process.env.ANTHROPIC_API_KEY!,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 200,
      system: SYSTEM,
      messages: [{ role: "user", content: `Write the blurb from these notes:\n\n${notes}` }],
    }),
  });
  if (!res.ok) {
    console.log(`  ! API ${res.status}: ${(await res.text()).slice(0, 200)}`);
    return null;
  }
  const json = (await res.json()) as { content?: { type: string; text?: string }[] };
  const text = json.content?.find((c) => c.type === "text")?.text?.trim();
  return text ? text.replace(/^["“]|["”]$/g, "").trim() : null;
}

async function main() {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY not set — existing blurbs remain in place.");
  }
  const sb = createAdminClient();

  const { data: items, error } = await sb
    .from("items")
    .select("id,name,subtype,city,price_tier,metadata");
  if (error) throw new Error(error.message);

  let list = (items ?? []) as ItemLite[];
  if (limit > 0) list = list.slice(0, limit);

  console.log(`Generating blurbs for ${list.length} items with ${MODEL}…`);
  let ok = 0;
  for (const v of list) {
    const { data: takes } = await sb
      .from("takes")
      .select("verdict,superlatives,highlights,score,best_of_language")
      .eq("item_id", v.id)
      .order("score", { ascending: false, nullsFirst: false });

    const notes = buildNotes(v, (takes ?? []) as TakeLite[]);
    const blurb = await generateBlurb(notes);
    if (blurb) {
      // Merge, don't replace: metadata also carries cuisine.
      const metadata = { ...(v.metadata ?? {}), blurb };
      await sb.from("items").update({ metadata }).eq("id", v.id);
      ok++;
      console.log(`  ✓ ${v.name}: ${blurb.slice(0, 60)}…`);
    } else {
      console.log(`  ✗ ${v.name} (kept existing)`);
    }
    await sleep(120);
  }
  console.log(`\nDone. ${ok}/${list.length} blurbs written.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
