// Download critic portraits from Wikimedia into /public/critics and repoint
// avatar_url at the local static path — so brand-critical faces are served from
// our own domain (no external rate-limits, instant, cached by Vercel's CDN).
//
//   node --env-file=.env.local scripts/localize-avatars.ts
//
// Wikimedia Commons images are CC / public domain; attribution is provided on
// the critic pages / in the repo credits.

import { writeFile, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { createAdminClient } from "../lib/supabase/admin.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, "..", "public", "critics");
const UA = "OnlyCritics/1.0 (ryan@dupely.io; contact ryan@dupely.io)";
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function main() {
  await mkdir(OUT, { recursive: true });
  const sb = createAdminClient();
  const { data } = await sb
    .from("critics")
    .select("slug,name,avatar_url")
    .like("avatar_url", "https://upload.wikimedia.org/%");

  const critics = (data ?? []) as { slug: string; name: string; avatar_url: string }[];
  let ok = 0;
  for (const c of critics) {
    // Retry politely on 429.
    let buf: ArrayBuffer | null = null;
    for (let attempt = 0; attempt < 4 && !buf; attempt++) {
      const res = await fetch(c.avatar_url, { headers: { "User-Agent": UA } });
      if (res.ok) buf = await res.arrayBuffer();
      else {
        console.log(`  … ${c.slug} got ${res.status}, waiting`);
        await sleep(4000);
      }
    }
    if (!buf) {
      console.log(`  ✗ ${c.slug}: could not download`);
      continue;
    }
    const file = `${c.slug}.jpg`;
    await writeFile(join(OUT, file), Buffer.from(buf));
    await sb.from("critics").update({ avatar_url: `/critics/${file}` }).eq("slug", c.slug);
    ok++;
    console.log(`  ✓ ${c.slug} (${Math.round(buf.byteLength / 1024)}kb) -> /critics/${file}`);
    await sleep(1500);
  }
  console.log(`\nDone. ${ok}/${critics.length} avatars localized.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
