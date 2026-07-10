// Set critic avatars from freely-licensed Wikidata/Wikimedia Commons portraits.
//
//   node --env-file=.env.local scripts/avatars.ts
//
// Uses Wikidata's P18 ("image") property — the curated portrait of the person,
// not an article's arbitrary lead image. Commons images are freely licensed
// (CC / public domain). Critics with no free portrait (e.g. camera-shy Michael
// Burry) keep their monogram — we never grab a copyrighted photo.

import { createAdminClient } from "../lib/supabase/admin.ts";

const UA = "OnlyCritics/1.0 (ryan@dupely.io; contact ryan@dupely.io)";

// critic slug -> Wikipedia article title (public facts, not opinions).
const TITLES: Record<string, string> = {
  "warren-buffett": "Warren Buffett",
  "bill-ackman": "Bill Ackman",
  "michael-burry": "Michael Burry",
  "david-tepper": "David Tepper",
  "stanley-druckenmiller": "Stanley Druckenmiller",
  "dan-loeb": "Daniel S. Loeb",
  "reeses-book-club": "Reese Witherspoon",
  "oprahs-book-club": "Oprah Winfrey",
  "read-with-jenna": "Jenna Bush Hager",
  "dave-portnoy": "Dave Portnoy",
};

async function jget(url: string): Promise<unknown> {
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.json();
}

async function titleToEntity(titles: string[]): Promise<Map<string, string>> {
  const u =
    "https://en.wikipedia.org/w/api.php?" +
    new URLSearchParams({
      action: "query",
      titles: titles.join("|"),
      prop: "pageprops",
      ppprop: "wikibase_item",
      redirects: "1",
      format: "json",
      formatversion: "2",
    });
  const d = (await jget(u)) as {
    query: {
      redirects?: { from: string; to: string }[];
      pages: { title: string; pageprops?: { wikibase_item?: string } }[];
    };
  };
  const redir = new Map((d.query.redirects ?? []).map((r) => [r.from, r.to]));
  const t2q = new Map<string, string>();
  for (const p of d.query.pages) {
    if (p.pageprops?.wikibase_item) t2q.set(p.title, p.pageprops.wikibase_item);
  }
  // Map original titles through any redirects.
  const out = new Map<string, string>();
  for (const t of titles) {
    const canonical = redir.get(t) ?? t;
    const q = t2q.get(canonical);
    if (q) out.set(t, q);
  }
  return out;
}

async function entityImage(q: string): Promise<string | null> {
  const d = (await jget(`https://www.wikidata.org/wiki/Special:EntityData/${q}.json`)) as {
    entities: Record<string, { claims: Record<string, { mainsnak: { datavalue?: { value: string } } }[]> }>;
  };
  const p18 = d.entities[q]?.claims?.P18;
  const filename = p18?.[0]?.mainsnak?.datavalue?.value;
  if (!filename) return null;
  // Special:FilePath serves a scaled image and 302-redirects to upload.wikimedia.org.
  const filePath = `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(filename)}?width=400`;
  // Resolve to the direct, stable image URL so we don't redirect on every load.
  const res = await fetch(filePath, { headers: { "User-Agent": UA }, redirect: "follow" });
  return res.ok ? res.url : filePath;
}

async function main() {
  const sb = createAdminClient();
  const entities = await titleToEntity(Object.values(TITLES));

  let set = 0;
  let missing = 0;
  for (const [slug, title] of Object.entries(TITLES)) {
    const q = entities.get(title);
    let img: string | null = null;
    if (q) {
      try {
        img = await entityImage(q);
      } catch (e) {
        console.log(`  ! ${slug}: ${(e as Error).message}`);
      }
    }
    if (!img) {
      missing++;
      console.log(`  – ${slug}: no free portrait, keeping monogram`);
      continue;
    }
    const { error } = await sb.from("critics").update({ avatar_url: img }).eq("slug", slug);
    if (error) throw new Error(`update ${slug}: ${error.message}`);
    set++;
    console.log(`  ✓ ${slug}`);
    await new Promise((r) => setTimeout(r, 120));
  }
  console.log(`\nDone. ${set} avatars set, ${missing} kept as monogram.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
