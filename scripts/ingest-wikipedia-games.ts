// Seed GAMING from Wikipedia's {{Video game reviews}} tables.
//
//   node --env-file=.env.local scripts/ingest-wikipedia-games.ts
//
// Why Wikipedia and not IGN/Metacritic directly: those sites block our crawler
// (robots.txt) or forbid scraping. Wikipedia legally compiles the same critic
// scores — IGN, GameSpot, Edge, Famitsu, Eurogamer, Polygon… — in a standardized,
// CC BY-SA reviews table, each score citing the outlet's own review URL. We read
// that table (built for reuse), attribute each score to the outlet, normalize it
// to 0-10, and link the take back to the outlet's real review. Nothing invented.

import { createAdminClient } from "../lib/supabase/admin.ts";
import { slugify } from "../lib/util.ts";
import { normalizeScore } from "../lib/scores.ts";

const UA = "OnlyCritics/1.0 (ryan@dupely.io; contact ryan@dupely.io)";

// Wikipedia {{Video game reviews}} param → outlet. Individual publications only;
// the aggregators (MC/OC) are kept as a reference score on the item, not as a
// "critic", so consensus isn't just an average of an average.
const OUTLETS: Record<string, { slug: string; name: string }> = {
  IGN: { slug: "ign", name: "IGN" },
  GSpot: { slug: "gamespot", name: "GameSpot" },
  GI: { slug: "game-informer", name: "Game Informer" },
  Edge: { slug: "edge", name: "Edge" },
  Fam: { slug: "famitsu", name: "Famitsu" },
  EuroG: { slug: "eurogamer", name: "Eurogamer" },
  Poly: { slug: "polygon", name: "Polygon" },
  Destruct: { slug: "destructoid", name: "Destructoid" },
  GRadar: { slug: "gamesradar", name: "GamesRadar+" },
  EGM: { slug: "egm", name: "Electronic Gaming Monthly" },
  PCGUS: { slug: "pc-gamer", name: "PC Gamer" },
  PCGN: { slug: "pcgamesn", name: "PCGamesN" },
  GameRev: { slug: "gamerevolution", name: "GameRevolution" },
  GB: { slug: "giant-bomb", name: "Giant Bomb" },
  HCG: { slug: "hardcore-gamer", name: "Hardcore Gamer" },
  NLife: { slug: "nintendo-life", name: "Nintendo Life" },
  NWR: { slug: "nintendo-world-report", name: "Nintendo World Report" },
  USG: { slug: "usgamer", name: "USgamer" },
  VG247: { slug: "vg247", name: "VG247" },
  EZA: { slug: "easy-allies", name: "Easy Allies" },
  JXV: { slug: "jeuxvideo", name: "Jeuxvideo.com" },
};

const BIO: Record<string, string> = {
  ign: "The biggest name in games media. An IGN score sets the tone for a launch.",
  gamespot: "One of the oldest and most-read games review sites.",
  "game-informer": "Long-running print-and-web magazine known for deep review coverage.",
  edge: "The UK's most prestigious games magazine — famously hard to impress.",
  famitsu: "Japan's most influential games magazine; its four-reviewer 40-point score is legendary.",
  eurogamer: "Europe's leading games site, known for essays and its Essential/Recommended verdicts.",
  polygon: "Vox Media's games publication, strong on craft and culture.",
  destructoid: "Independent games site with a distinctive voice.",
  gamesradar: "Broad games and entertainment coverage with a five-star scale.",
  egm: "Electronic Gaming Monthly — a founding voice of US games criticism.",
  "pc-gamer": "The authority on PC gaming.",
  pcgamesn: "PC-focused reviews and guides.",
  gamerevolution: "Long-running games site.",
  "giant-bomb": "Critic-driven site founded by veteran reviewers.",
  "hardcore-gamer": "Enthusiast games publication.",
  "nintendo-life": "The definitive Nintendo site.",
  "nintendo-world-report": "Nintendo-focused reviews.",
  usgamer: "US games site known for thoughtful reviews.",
  vg247: "Fast-moving games news and reviews.",
  "easy-allies": "Crew of veteran critics funded by their audience.",
  jeuxvideo: "France's largest games site.",
};

// Acclaimed / widely-covered games — chosen for overlapping outlet coverage so
// consensus lights up. Titles are exact Wikipedia article names.
const GAMES = [
  "Elden Ring",
  "The Legend of Zelda: Breath of the Wild",
  "The Legend of Zelda: Tears of the Kingdom",
  "God of War (2018 video game)",
  "God of War Ragnarök",
  "Hades (video game)",
  "Baldur's Gate 3",
  "The Witcher 3: Wild Hunt",
  "Red Dead Redemption 2",
  "Grand Theft Auto V",
  "The Last of Us (video game)",
  "The Last of Us Part II",
  "Marvel's Spider-Man (2018 video game)",
  "Cyberpunk 2077",
  "Hollow Knight",
  "Celeste (video game)",
  "Stardew Valley",
  "Disco Elysium",
  "Sekiro: Shadows Die Twice",
  "Bloodborne",
  "Dark Souls III",
  "Super Mario Odyssey",
  "Animal Crossing: New Horizons",
  "Persona 5",
  "Final Fantasy VII Remake",
  "Resident Evil 4 (2023 video game)",
  "Death Stranding",
  "Ghost of Tsushima",
  "Horizon Zero Dawn",
  "Horizon Forbidden West",
  "Metroid Dread",
  "Returnal",
  "It Takes Two (video game)",
  "Portal 2",
  "The Elder Scrolls V: Skyrim",
  "Mass Effect 2",
  "Doom (2016 video game)",
  "Half-Life 2",
  "Undertale",
  "Cuphead",
  "Ori and the Blind Forest",
  "Nier: Automata",
  "Divinity: Original Sin II",
  "Alan Wake 2",
  "Balatro",
  "Astro Bot",
  "Metaphor: ReFantazio",
  "Black Myth: Wukong",
  "Super Mario Bros. Wonder",
  "Final Fantasy XVI",
];

async function fetchWikitext(title: string): Promise<string> {
  const url =
    "https://en.wikipedia.org/w/api.php?" +
    new URLSearchParams({ action: "parse", page: title, prop: "wikitext", format: "json", formatversion: "2" });
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = (await res.json()) as { parse?: { wikitext?: string } };
  return json.parse?.wikitext ?? "";
}

// Extract the {{Video game reviews ... }} block by brace matching.
function reviewsBlock(wt: string): string | null {
  const start = wt.indexOf("{{Video game reviews");
  if (start < 0) return null;
  let depth = 0;
  for (let i = start; i < wt.length; i++) {
    if (wt[i] === "{" && wt[i + 1] === "{") { depth++; i++; }
    else if (wt[i] === "}" && wt[i + 1] === "}") { depth--; i++; if (depth === 0) return wt.slice(start, i + 1); }
  }
  return null;
}

// Split the template into top-level "KEY = VALUE" params, respecting {{}} and [[]].
function splitParams(block: string): Array<{ key: string; val: string }> {
  const s = block.replace(/^\{\{/, "").replace(/\}\}$/, "");
  const parts: string[] = [];
  let c = 0, b = 0, cur = "";
  for (let i = 0; i < s.length; i++) {
    const two = s.slice(i, i + 2);
    if (two === "{{") { c++; cur += two; i++; continue; }
    if (two === "}}") { c--; cur += two; i++; continue; }
    if (two === "[[") { b++; cur += two; i++; continue; }
    if (two === "]]") { b--; cur += two; i++; continue; }
    if (s[i] === "|" && c === 0 && b === 0) { parts.push(cur); cur = ""; continue; }
    cur += s[i];
  }
  parts.push(cur);
  const out: Array<{ key: string; val: string }> = [];
  for (const p of parts.slice(1)) {
    const eq = p.indexOf("=");
    if (eq < 0) continue;
    out.push({ key: p.slice(0, eq).trim(), val: p.slice(eq + 1) });
  }
  return out;
}

function cleanScoreText(val: string): string {
  return val
    .replace(/<ref[^>]*>[\s\S]*?<\/ref>/g, "")
    .replace(/<ref[^>]*\/>/g, "")
    .replace(/\{\{efn[\s\S]*?\}\}/gi, "")
    .replace(/\{\{[\s\S]*?\}\}/g, "")
    .replace(/<br\s*\/?>/g, " ")
    .replace(/\[\[[^\]]*\|([^\]]*)\]\]/g, "$1")
    .replace(/\[\[|\]\]/g, "")
    .replace(/'''?/g, "")
    .replace(/<[^>]+>/g, "")
    .trim();
}

function extractScore(val: string): { original: string | null; stance: string | null } {
  const t = cleanScoreText(val);
  const frac = t.match(/(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)/);
  if (frac) return { original: `${frac[1]}/${frac[2]}`, stance: null };
  const pct = t.match(/(\d{1,3})\s*%/);
  if (pct) return { original: `${pct[1]}%`, stance: null };
  const lg = t.match(/^([A-F][+-]?)\b/);
  if (lg) return { original: lg[1], stance: null };
  const verb = t.match(/\b(Essential|Recommended|Avoid)\b/i);
  if (verb) return { original: null, stance: verb[1] };
  return { original: null, stance: null };
}

function extractUrl(val: string): string | null {
  const urls = [...val.matchAll(/https?:\/\/[^\s|}\]<>"']+/g)].map((m) => m[0]);
  return urls.find((u) => !u.includes("web.archive.org")) ?? urls[0] ?? null;
}

function cleanTitle(title: string): string {
  return title.replace(/\s*\((?:\d{4}\s+)?video game\)$/i, "").trim();
}

async function main() {
  const sb = createAdminClient();
  const { data: cat } = await sb.from("categories").select("id").eq("slug", "gaming").maybeSingle();
  if (!cat) throw new Error("gaming category missing — run migration 0001");
  const categoryId = (cat as { id: string }).id;

  // Upsert all outlet critics up-front, then wipe their takes for idempotency.
  const criticId = new Map<string, string>();
  for (const { slug, name } of Object.values(OUTLETS)) {
    await sb.from("critics").upsert(
      {
        slug, name, category_id: categoryId, platform: "Games media",
        source_url: `https://en.wikipedia.org/wiki/${encodeURIComponent(name.replace(/ /g, "_"))}`,
        bio: BIO[slug] ?? `${name} — games criticism.`, score_style: "numeric", active: true,
      },
      { onConflict: "slug" },
    );
    const { data: c } = await sb.from("critics").select("id").eq("slug", slug).maybeSingle();
    criticId.set(slug, (c as { id: string }).id);
  }
  await sb.from("takes").delete().in("critic_id", [...criticId.values()]);

  let newItems = 0, totalTakes = 0, skipped = 0;

  for (const title of GAMES) {
    let wt = "";
    try {
      wt = await fetchWikitext(title);
    } catch (e) {
      console.log(`  ✗ ${title}: fetch failed (${(e as Error).message})`);
      skipped++;
      continue;
    }
    const block = reviewsBlock(wt);
    if (!block) {
      console.log(`  – ${title}: no reviews table`);
      skipped++;
      continue;
    }

    const name = cleanTitle(title);
    const slug = slugify(name);
    const wikiUrl = `https://en.wikipedia.org/wiki/${encodeURIComponent(title.replace(/ /g, "_"))}`;

    // Reference aggregate (Metacritic) for the item, not counted as a critic.
    const params = splitParams(block);
    const mc = params.find((p) => p.key === "MC");
    const metascore = mc ? cleanScoreText(mc.val).match(/(\d{2,3})\s*\/\s*100/)?.[1] ?? null : null;

    // Upsert item.
    const { data: existing } = await sb
      .from("items").select("id,metadata").eq("category_id", categoryId).eq("slug", slug).maybeSingle();
    let itemId: string;
    if (existing) {
      itemId = (existing as { id: string }).id;
      if (metascore)
        await sb.from("items").update({ metadata: { ...(existing as { metadata?: object }).metadata, metascore: Number(metascore) } }).eq("id", itemId);
    } else {
      const { data: ins, error } = await sb
        .from("items")
        .insert({
          category_id: categoryId, slug, name, subtype: "Game",
          metadata: metascore ? { metascore: Number(metascore) } : {},
        })
        .select("id").single();
      if (error) throw new Error(`item "${name}": ${error.message}`);
      itemId = (ins as { id: string }).id;
      newItems++;
    }

    let takesForGame = 0;
    for (const { key, val } of params) {
      const outlet = OUTLETS[key];
      if (!outlet) continue;
      const { original, stance } = extractScore(val);
      if (!original && !stance) continue;
      const score = original ? normalizeScore(original) : null;
      const cid = criticId.get(outlet.slug)!;
      const { error } = await sb.from("takes").insert({
        critic_id: cid, item_id: itemId,
        score, score_original: original, stance,
        source_platform: outlet.name,
        source_title: `${outlet.name} review of ${name}`,
        source_url: extractUrl(val) ?? wikiUrl,
      });
      if (error) throw new Error(`take ${outlet.slug}/${name}: ${error.message}`);
      takesForGame++;
      totalTakes++;
    }
    console.log(`  ✓ ${name}: ${takesForGame} critic takes${metascore ? ` (MC ${metascore})` : ""}`);
    await new Promise((r) => setTimeout(r, 300));
  }

  console.log(`\nDone. ${newItems} new games, ${totalTakes} takes, ${skipped} skipped.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
