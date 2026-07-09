// Generate Jack-voice blurbs for each venue from its mentions, via the
// Anthropic API (no SDK — plain fetch).
//
//   node --env-file=.env.local scripts/blurbs.ts             # all venues
//   node --env-file=.env.local scripts/blurbs.ts --limit 10  # test a few
//
// Requires ANTHROPIC_API_KEY + SUPABASE_SERVICE_ROLE_KEY. Without the Anthropic
// key, the seeded fallback blurbs (top mention verdict) remain in place.

import { createAdminClient } from "../lib/supabase/admin.ts";

const MODEL = process.env.ANTHROPIC_MODEL || "claude-haiku-4-5-20251001";

const SYSTEM = `You write one-line blurbs for Jackslist, a food-discovery site built on the recommendations of the YouTube creator Jack (Jack's Dining Room).

Voice: punchy, confident, casual, hype but earned. Short declaratives. Superlative-driven but specific. Name the dish to get. Present tense. No corporate copy, no hedging. You may refer to "Jack" in the third person and use imperatives ("Get the...").

Rules:
- 1–2 sentences, max ~240 characters.
- Use ONLY facts present in the provided notes. Never invent dishes, awards, or claims.
- If a must-order dish is given, name it.
- Output ONLY the blurb text — no quotes, no preamble.

Good example: "Jack's pick for the best pizza in New York. Get the cheese slice, then the chicken cutlet burrata sandwich — he'd put it on the iron throne."`;

const args = process.argv.slice(2);
const limitArg = args.indexOf("--limit");
const limit = limitArg >= 0 ? parseInt(args[limitArg + 1] ?? "0", 10) : 0;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

type MentionLite = {
  verdict: string | null;
  superlatives: string | null;
  dishes_called_out: string | null;
  must_order: string | null;
  score: number | null;
  best_of_language: boolean | null;
};

function buildNotes(
  v: { name: string; category: string | null; cuisine_type: string | null; city: string | null; price_tier: string | null },
  mentions: MentionLite[],
): string {
  const lines = [
    `Venue: ${v.name}`,
    `Category: ${v.category ?? "—"}${v.cuisine_type ? ` (${v.cuisine_type})` : ""}`,
    `City: ${v.city ?? "—"}`,
    v.price_tier ? `Price: ${v.price_tier}` : "",
    "",
    "Jack's mentions:",
  ];
  for (const m of mentions.slice(0, 6)) {
    const bits = [
      m.verdict,
      m.must_order ? `Must order: ${m.must_order}` : m.dishes_called_out ? `Dishes: ${m.dishes_called_out}` : "",
      m.superlatives ? `Superlatives: ${m.superlatives}` : "",
      m.best_of_language ? "(called a best-of)" : "",
      m.score != null ? `[score ${m.score}/10]` : "",
    ].filter(Boolean);
    lines.push(`- ${bits.join(" — ")}`);
  }
  return lines.filter((l) => l !== undefined).join("\n");
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
    throw new Error("ANTHROPIC_API_KEY not set — seeded fallback blurbs remain in place.");
  }
  const sb = createAdminClient();

  const { data: venues, error } = await sb
    .from("venues")
    .select("id,name,category,cuisine_type,city,price_tier")
    .order("mention_count", { ascending: false });
  if (error) throw new Error(error.message);

  let list = (venues ?? []) as {
    id: string;
    name: string;
    category: string | null;
    cuisine_type: string | null;
    city: string | null;
    price_tier: string | null;
  }[];
  if (limit > 0) list = list.slice(0, limit);

  console.log(`Generating blurbs for ${list.length} venues with ${MODEL}…`);
  let ok = 0;
  for (const v of list) {
    const { data: mentions } = await sb
      .from("mentions")
      .select("verdict,superlatives,dishes_called_out,must_order,score,best_of_language")
      .eq("venue_id", v.id)
      .order("score", { ascending: false, nullsFirst: false });

    const notes = buildNotes(v, (mentions ?? []) as MentionLite[]);
    const blurb = await generateBlurb(notes);
    if (blurb) {
      await sb.from("venues").update({ jack_blurb: blurb }).eq("id", v.id);
      ok++;
      console.log(`  ✓ ${v.name}: ${blurb.slice(0, 60)}…`);
    } else {
      console.log(`  ✗ ${v.name} (kept fallback)`);
    }
    await sleep(120);
  }
  console.log(`\nDone. ${ok}/${list.length} blurbs written.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
