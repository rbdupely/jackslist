// Set book item cover images from Open Library (open data, no key).
//
//   node --env-file=.env.local scripts/book-covers.ts
//
// Looks each book up by title + author and stores its cover as the item photo.
// Best-effort: very new titles may have no cover yet — those keep the gradient
// placeholder. Open Library is CC0/open and built for this.

import { createAdminClient } from "../lib/supabase/admin.ts";

const UA = "OnlyCritics/1.0 (ryan@dupely.io; contact ryan@dupely.io)";
const force = process.argv.slice(2).includes("--force");
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function coverFor(title: string, author: string | null): Promise<string | null> {
  const params = new URLSearchParams({
    title,
    limit: "1",
    fields: "title,cover_i,cover_edition_key",
  });
  if (author) params.set("author", author);
  const res = await fetch(`https://openlibrary.org/search.json?${params}`, {
    headers: { "User-Agent": UA },
  });
  if (!res.ok) return null;
  const json = (await res.json()) as { docs?: { cover_i?: number }[] };
  const coverId = json.docs?.[0]?.cover_i;
  return coverId ? `https://covers.openlibrary.org/b/id/${coverId}-L.jpg` : null;
}

async function main() {
  const sb = createAdminClient();
  const { data: cat } = await sb.from("categories").select("id").eq("slug", "books").maybeSingle();
  if (!cat) throw new Error("books category missing");

  const { data: items } = await sb
    .from("items")
    .select("id,name,creator,photo_url")
    .eq("category_id", (cat as { id: string }).id);

  let set = 0;
  let missing = 0;
  for (const b of (items ?? []) as { id: string; name: string; creator: string | null; photo_url: string | null }[]) {
    if (b.photo_url && !force) continue;
    let cover: string | null = null;
    try {
      cover = await coverFor(b.name, b.creator);
    } catch {
      /* ignore */
    }
    if (!cover) {
      missing++;
    } else {
      await sb.from("items").update({ photo_url: cover }).eq("id", b.id);
      set++;
    }
    await sleep(90);
  }
  console.log(`Done. ${set} book covers set, ${missing} without a cover (kept placeholder).`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
