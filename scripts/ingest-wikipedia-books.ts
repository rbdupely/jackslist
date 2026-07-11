// Ingest book-club curators' real, dated selections from Wikipedia into
// items + takes.
//
//   node --env-file=.env.local scripts/ingest-wikipedia-books.ts
//
// Wikipedia content is CC BY-SA and its API is built for reuse. Each curator's
// article has a wikitable of their picks (date, title, author). A pick is a
// stance take ("selected"), attributed to the curator, dated, and linked back
// to the source article. No scores are invented — a book-club pick is an
// endorsement, not a rating.

import { createAdminClient } from "../lib/supabase/admin.ts";
import { slugify } from "../lib/util.ts";

const UA = "OnlyCritics/1.0 (ryan@dupely.io; contact ryan@dupely.io)";

type Curator = {
  slug: string;
  name: string;
  page: string;
  bio: string;
  platform: string; // "Book Club" | "Literary Prize"
};

const CURATORS: Curator[] = [
  {
    slug: "reeses-book-club",
    name: "Reese Witherspoon",
    page: "Reese's Book Club",
    platform: "Book Club",
    bio: "Actor and founder of Reese's Book Club, which names one book a month — usually stories with women at the center.",
  },
  {
    slug: "oprahs-book-club",
    name: "Oprah Winfrey",
    page: "Oprah's Book Club",
    platform: "Book Club",
    bio: "The most influential book endorsement in America. An Oprah's Book Club pick reliably becomes a bestseller.",
  },
  {
    slug: "read-with-jenna",
    name: "Jenna Bush Hager",
    page: "Jenna Bush Hager",
    platform: "Book Club",
    bio: "Today show host whose Read with Jenna book club names a monthly pick that routinely tops bestseller lists.",
  },
  // Awards & Guides — institutions, not individual humans. Kept in a separate
  // lane from the human critics (platform === "Literary Prize").
  {
    slug: "pulitzer-fiction",
    name: "The Pulitzer Prize for Fiction",
    page: "Pulitzer Prize for Fiction",
    platform: "Literary Prize",
    bio: "American letters' most prestigious fiction award, given yearly since 1918 for distinguished fiction by an American author.",
  },
  {
    slug: "booker-prize",
    name: "The Booker Prize",
    page: "Booker Prize",
    platform: "Literary Prize",
    bio: "The leading award for English-language literary fiction. A Booker win makes a novel — and its author's career.",
  },
  {
    slug: "national-book-award-fiction",
    name: "The National Book Award for Fiction",
    page: "National Book Award for Fiction",
    platform: "Literary Prize",
    bio: "One of the US's premier literary honors, awarded annually since 1950.",
  },
];

const JUNK_TITLES = new Set([
  "novel", "fiction", "poetry", "drama", "history", "biography", "general nonfiction",
  "biography or autobiography", "music", "special citations", "no award", "not awarded",
  "general fiction", "nonfiction", "title", "work",
]);

const strip = (s: string) =>
  s
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ")
    .replace(/&#\d+;/g, " ")
    .replace(/\[\d+\]/g, "")
    .replace(/"/g, '"')
    .trim();

// First wikilinked text in a cell (the title/author), else stripped text.
function cellMain(cellHtml: string): string {
  const link = cellHtml.match(/<a[^>]*>(.*?)<\/a>/);
  return strip(link ? link[1] : cellHtml).replace(/^["']|["']$/g, "").trim();
}

async function fetchTable(page: string): Promise<{ headers: string[]; rows: string[][] }> {
  const url =
    "https://en.wikipedia.org/w/api.php?" +
    new URLSearchParams({ action: "parse", page, prop: "text", format: "json", formatversion: "2" });
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  if (!res.ok) throw new Error(`wikipedia HTTP ${res.status} for ${page}`);
  const json = (await res.json()) as { parse?: { text?: string } };
  const html = json.parse?.text;
  if (!html) throw new Error(`no parse text for ${page}`);

  const tables = html.match(/<table[^>]*wikitable[^>]*>[\s\S]*?<\/table>/g) ?? [];
  if (!tables.length) throw new Error(`no wikitable on ${page}`);
  const big = tables.reduce((a, b) => (b.length > a.length ? b : a));

  const trBlocks = big.split(/<tr[^>]*>/).slice(1);
  const rows: string[][] = [];
  let headers: string[] = [];
  for (const tr of trBlocks) {
    const cells = [...tr.matchAll(/<t([dh])[^>]*>([\s\S]*?)<\/t\1>/g)].map((m) => m[2]);
    if (!cells.length) continue;
    if (/<th/i.test("<t" + (tr.match(/<t([dh])/)?.[1] ?? "d")) && !headers.length && /<th/i.test(tr)) {
      headers = cells.map((c) => strip(c).toLowerCase());
    } else {
      rows.push(cells);
    }
  }
  return { headers, rows };
}

function colIndex(headers: string[], ...names: string[]): number {
  for (const n of names) {
    const i = headers.findIndex((h) => h.includes(n));
    if (i >= 0) return i;
  }
  return -1;
}

function parseYear(dateText: string): { iso: string | null; year: number | null } {
  const t = strip(dateText);
  const ym = t.match(/([A-Z][a-z]+)\s+(\d{4})/); // "July 2026"
  const months: Record<string, string> = {
    january: "01", february: "02", march: "03", april: "04", may: "05", june: "06",
    july: "07", august: "08", september: "09", october: "10", november: "11", december: "12",
  };
  if (ym) {
    const mm = months[ym[1].toLowerCase()] ?? "01";
    return { iso: `${ym[2]}-${mm}-01`, year: Number(ym[2]) };
  }
  const y = t.match(/(\d{4})/);
  return y ? { iso: `${y[1]}-01-01`, year: Number(y[1]) } : { iso: null, year: null };
}

async function main() {
  const sb = createAdminClient();
  const { data: cat } = await sb.from("categories").select("id").eq("slug", "books").maybeSingle();
  if (!cat) throw new Error("books category missing — run migration 0001");
  const categoryId = (cat as { id: string }).id;

  let totalItems = 0;
  let totalTakes = 0;

  for (const c of CURATORS) {
   try {
    const { headers, rows } = await fetchTable(c.page);
    const di = colIndex(headers, "date", "month", "year");
    const ti = colIndex(headers, "title", "book", "work", "novel");
    const ai = colIndex(headers, "author");
    if (ti < 0) {
      console.log(`  ${c.name}: could not find a title column in [${headers}] — skipping`);
      continue;
    }

    await sb.from("critics").upsert(
      {
        slug: c.slug,
        name: c.name,
        category_id: categoryId,
        platform: c.platform,
        source_url: `https://en.wikipedia.org/wiki/${encodeURIComponent(c.page.replace(/ /g, "_"))}`,
        bio: c.bio,
        score_style: "stance",
        active: true,
      },
      { onConflict: "slug" },
    );
    const { data: critic } = await sb.from("critics").select("id").eq("slug", c.slug).maybeSingle();
    const criticId = (critic as { id: string }).id;
    await sb.from("takes").delete().eq("critic_id", criticId);

    const seen = new Set<string>();
    let items = 0;
    let takes = 0;

    for (const cells of rows) {
      const title = ti < cells.length ? cellMain(cells[ti]) : "";
      if (!title || title.length < 2) continue;
      // Prize tables interleave genre subheader rows ("Novel", "Poetry"…) — skip them.
      if (JUNK_TITLES.has(title.toLowerCase())) continue;
      const slug = slugify(title);
      if (!slug || seen.has(slug)) continue;
      seen.add(slug);

      const author = ai >= 0 && ai < cells.length ? cellMain(cells[ai]) : null;
      const { iso, year } = di >= 0 && di < cells.length ? parseYear(cells[di]) : { iso: null, year: null };

      const { data: existing } = await sb
        .from("items")
        .select("id")
        .eq("category_id", categoryId)
        .eq("slug", slug)
        .maybeSingle();

      let itemId: string;
      if (existing) {
        itemId = (existing as { id: string }).id;
      } else {
        const { data: ins, error } = await sb
          .from("items")
          .insert({ category_id: categoryId, slug, name: title, creator: author, year, subtype: "Book" })
          .select("id")
          .single();
        if (error) throw new Error(`item "${title}": ${error.message}`);
        itemId = (ins as { id: string }).id;
        items++;
      }

      const { error: tErr } = await sb.from("takes").insert({
        critic_id: criticId,
        item_id: itemId,
        verdict: null,
        score: null,
        stance: c.platform === "Literary Prize" ? "honored" : "selected",
        source_platform: c.platform,
        source_title:
          c.platform === "Literary Prize" ? `${c.name} honoree` : `${c.name}'s Book Club selection`,
        source_url: `https://en.wikipedia.org/wiki/${encodeURIComponent(c.page.replace(/ /g, "_"))}`,
        published_on: iso,
      });
      if (tErr) throw new Error(`take "${title}": ${tErr.message}`);
      takes++;
    }

    console.log(`  ${c.name}: ${items} new books, ${takes} picks`);
    totalItems += items;
    totalTakes += takes;
   } catch (e) {
     console.log(`  ${c.name}: skipped (${(e as Error).message})`);
   }
  }

  console.log(`\nDone. ${totalItems} new books, ${totalTakes} picks.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
