// Ingest real 13F-HR holdings from SEC EDGAR into items + takes.
//
//   node --env-file=.env.local scripts/ingest-edgar.ts
//   node --env-file=.env.local scripts/ingest-edgar.ts --quarters 4
//
// EDGAR is public domain and explicitly permits automated access provided you
// send a User-Agent identifying yourself and stay under 10 req/s.
// https://www.sec.gov/os/accessing-edgar-data
//
// There are no quotes here to invent: a 13F IS the disclosure. Each take is a
// factual, filing-derived statement of what the fund reported holding, with a
// stance computed by diffing consecutive quarters.

import { createAdminClient } from "../lib/supabase/admin.ts";
import { slugify } from "../lib/util.ts";

const UA = "OnlyCritics/1.0 (ryan@dupely.io)";
const args = process.argv.slice(2);
const qArg = args.indexOf("--quarters");
const QUARTERS = qArg >= 0 ? parseInt(args[qArg + 1] ?? "4", 10) : 4;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

type Fund = {
  criticSlug: string;
  criticName: string;
  cik: string;
  fund: string;
  bio: string;
  sourceUrl: string;
};

// Two funds whose holdings are filed with the SEC every quarter. Buffett is
// credited as "Berkshire's disclosed positions" — he is chairman, and the
// filing is the company's, not a personal stock pick.
const FUNDS: Fund[] = [
  {
    criticSlug: "warren-buffett",
    criticName: "Warren Buffett",
    cik: "1067983",
    fund: "Berkshire Hathaway",
    bio: "Chairman of Berkshire Hathaway. These are Berkshire's disclosed 13F positions, not personal recommendations.",
    sourceUrl: "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0001067983&type=13F-HR",
  },
  {
    criticSlug: "bill-ackman",
    criticName: "Bill Ackman",
    cik: "1336528",
    fund: "Pershing Square Capital Management",
    bio: "Founder and CEO of Pershing Square. These are Pershing Square's disclosed 13F positions.",
    sourceUrl: "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0001336528&type=13F-HR",
  },
  {
    criticSlug: "michael-burry",
    criticName: "Michael Burry",
    cik: "1649339",
    fund: "Scion Asset Management",
    bio: "Of 'The Big Short'. Scion's disclosed 13F positions. Scion deregistered with the SEC in late 2025, so this data is historical through its final filing.",
    sourceUrl: "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0001649339&type=13F-HR",
  },
  {
    criticSlug: "david-tepper",
    criticName: "David Tepper",
    cik: "1656456",
    fund: "Appaloosa",
    bio: "Founder of Appaloosa and owner of the Carolina Panthers. Appaloosa's disclosed 13F positions.",
    sourceUrl: "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0001656456&type=13F-HR",
  },
  {
    criticSlug: "stanley-druckenmiller",
    criticName: "Stanley Druckenmiller",
    cik: "1536411",
    fund: "Duquesne Family Office",
    bio: "Legendary macro investor. His Duquesne Family Office's disclosed 13F positions.",
    sourceUrl: "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0001536411&type=13F-HR",
  },
  {
    criticSlug: "dan-loeb",
    criticName: "Dan Loeb",
    cik: "1040273",
    fund: "Third Point",
    bio: "Founder of Third Point. Third Point's disclosed 13F positions.",
    sourceUrl: "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0001040273&type=13F-HR",
  },
];

async function sec(url: string): Promise<string> {
  const res = await fetch(url, { headers: { "User-Agent": UA, Accept: "*/*" } });
  if (!res.ok) throw new Error(`SEC ${res.status} for ${url}`);
  await sleep(140); // stay well under 10 req/s
  return res.text();
}

type Filing = { accession: string; accessionDashed: string; reportDate: string; filingDate: string };

async function recentFilings(cik: string, n: number): Promise<Filing[]> {
  const json = JSON.parse(
    await sec(`https://data.sec.gov/submissions/CIK${cik.padStart(10, "0")}.json`),
  ) as {
    filings: { recent: { form: string[]; accessionNumber: string[]; reportDate: string[]; filingDate: string[] } };
  };
  const r = json.filings.recent;
  const out: Filing[] = [];
  for (let i = 0; i < r.form.length && out.length < n; i++) {
    if (r.form[i] === "13F-HR") {
      out.push({
        accession: r.accessionNumber[i].replace(/-/g, ""),
        accessionDashed: r.accessionNumber[i],
        reportDate: r.reportDate[i],
        filingDate: r.filingDate[i],
      });
    }
  }
  return out;
}

type Holding = { cusip: string; name: string; value: number; shares: number };

// The information table is flat, well-formed XML. Node ships no XML parser and
// we add no dependencies, so pull the fields out of each <infoTable> block.
// Tags may be namespace-prefixed (ns1:infoTable).
function parseInfoTable(xml: string): Map<string, Holding> {
  const blocks = xml.match(/<[\w:]*infoTable\b[\s\S]*?<\/[\w:]*infoTable>/g) ?? [];
  const field = (b: string, tag: string): string | null => {
    const m = b.match(new RegExp(`<[\\w:]*${tag}\\b[^>]*>([\\s\\S]*?)</[\\w:]*${tag}>`));
    return m ? m[1].trim() : null;
  };
  const agg = new Map<string, Holding>();
  for (const b of blocks) {
    const cusip = field(b, "cusip");
    const name = field(b, "nameOfIssuer");
    if (!cusip || !name) continue;
    const value = Number(field(b, "value") ?? 0);
    const shares = Number(field(b, "sshPrnamt") ?? 0);
    const prev = agg.get(cusip);
    if (prev) {
      prev.value += value;
      prev.shares += shares;
    } else {
      agg.set(cusip, { cusip, name, value, shares });
    }
  }
  return agg;
}

async function holdingsFor(cik: string, f: Filing): Promise<Map<string, Holding>> {
  const base = `https://www.sec.gov/Archives/edgar/data/${Number(cik)}/${f.accession}`;
  const index = JSON.parse(await sec(`${base}/index.json`)) as {
    directory: { item: { name: string; size?: string }[] };
  };
  // The info table is the largest .xml that isn't primary_doc.xml.
  const xmls = index.directory.item
    .filter((i) => i.name.endsWith(".xml") && i.name !== "primary_doc.xml")
    .sort((a, b) => Number(b.size ?? 0) - Number(a.size ?? 0));
  if (!xmls.length) return new Map();
  return parseInfoTable(await sec(`${base}/${xmls[0].name}`));
}

function quarterLabel(reportDate: string): string {
  const [y, m] = reportDate.split("-").map(Number);
  return `Q${Math.ceil(m / 3)} ${y}`;
}

function fmt(n: number): string {
  return n.toLocaleString("en-US");
}

function usd(n: number): string {
  if (n >= 1e9) return `$${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  return `$${fmt(n)}`;
}

type Stance = "new_buy" | "added" | "trimmed" | "holds" | "exited";

function describe(
  fund: string,
  h: Holding,
  stance: Stance,
  pct: number,
  quarter: string,
  priorShares: number,
): string {
  const pos = `${fmt(h.shares)} shares (${usd(h.value)}, ${pct.toFixed(2)}% of the portfolio)`;
  switch (stance) {
    case "new_buy":
      return `${fund} disclosed a new position in ${h.name} — ${pos} — as of ${quarter}.`;
    case "added":
      return `${fund} increased its ${h.name} stake from ${fmt(priorShares)} to ${fmt(h.shares)} shares in ${quarter}, now ${pos}.`;
    case "trimmed":
      return `${fund} reduced its ${h.name} stake from ${fmt(priorShares)} to ${fmt(h.shares)} shares in ${quarter}, now ${pos}.`;
    case "exited":
      return `${fund} exited ${h.name} in ${quarter}, having reported ${fmt(priorShares)} shares the prior quarter.`;
    default:
      return `${fund} held ${h.name} unchanged in ${quarter} — ${pos}.`;
  }
}

async function main() {
  const sb = createAdminClient();

  const { data: cat } = await sb.from("categories").select("id").eq("slug", "stocks").maybeSingle();
  if (!cat) throw new Error("stocks category missing — run migration 0001");
  const categoryId = (cat as { id: string }).id;

  let totalItems = 0;
  let totalTakes = 0;

  for (const f of FUNDS) {
    console.log(`\n=== ${f.criticName} (${f.fund}), CIK ${f.cik} ===`);

    // Upsert the critic. score_style 'stance': a 13F has no rating.
    await sb
      .from("critics")
      .upsert(
        {
          slug: f.criticSlug,
          name: f.criticName,
          category_id: categoryId,
          platform: "SEC EDGAR",
          source_url: f.sourceUrl,
          bio: f.bio,
          score_style: "stance",
          active: true,
        },
        { onConflict: "slug" },
      );
    const { data: critic } = await sb
      .from("critics")
      .select("id")
      .eq("slug", f.criticSlug)
      .maybeSingle();
    const criticId = (critic as { id: string }).id;

    // We need QUARTERS quarters plus one prior quarter to diff the oldest.
    const filings = await recentFilings(f.cik, QUARTERS + 1);
    console.log(`  ${filings.length} 13F-HR filings: ${filings.map((x) => x.reportDate).join(", ")}`);

    const snapshots: { filing: Filing; holdings: Map<string, Holding> }[] = [];
    for (const fl of filings) {
      const h = await holdingsFor(f.cik, fl);
      snapshots.push({ filing: fl, holdings: h });
      console.log(`    ${fl.reportDate}: ${h.size} positions`);
    }

    // Wipe this critic's takes so the run is idempotent.
    await sb.from("takes").delete().eq("critic_id", criticId);

    // Newest first. Diff snapshot[i] against snapshot[i+1] (the prior quarter).
    for (let i = 0; i < snapshots.length - 1; i++) {
      const { filing, holdings } = snapshots[i];
      const prior = snapshots[i + 1].holdings;
      const quarter = quarterLabel(filing.reportDate);
      const total = [...holdings.values()].reduce((s, h) => s + h.value, 0);
      // The canonical human-facing filing page. The bare directory listing
      // 403s, so never link to that.
      const sourceUrl = `https://www.sec.gov/Archives/edgar/data/${Number(f.cik)}/${filing.accession}/${filing.accessionDashed}-index.htm`;

      const rows: Record<string, unknown>[] = [];

      const consider: { h: Holding; stance: Stance; priorShares: number }[] = [];
      for (const [cusip, h] of holdings) {
        const p = prior.get(cusip);
        const priorShares = p?.shares ?? 0;
        let stance: Stance;
        if (!p) stance = "new_buy";
        else if (h.shares > p.shares) stance = "added";
        else if (h.shares < p.shares) stance = "trimmed";
        else stance = "holds";
        consider.push({ h, stance, priorShares });
      }
      // Exits: held last quarter, gone this quarter.
      for (const [cusip, p] of prior) {
        if (!holdings.has(cusip)) {
          consider.push({ h: { ...p, shares: 0, value: 0 }, stance: "exited", priorShares: p.shares });
        }
      }

      for (const { h, stance, priorShares } of consider) {
        const slug = slugify(h.name);
        if (!slug) continue;

        // Upsert the stock as an item in this category.
        const { data: existing } = await sb
          .from("items")
          .select("id,external_ids")
          .eq("category_id", categoryId)
          .eq("slug", slug)
          .maybeSingle();

        let itemId: string;
        if (existing) {
          itemId = (existing as { id: string }).id;
        } else {
          const { data: ins, error } = await sb
            .from("items")
            .insert({
              category_id: categoryId,
              slug,
              name: h.name,
              external_ids: { cusip: h.cusip },
            })
            .select("id")
            .single();
          if (error) throw new Error(`item ${h.name}: ${error.message}`);
          itemId = (ins as { id: string }).id;
          totalItems++;
        }

        const pct = total > 0 ? (h.value / total) * 100 : 0;
        rows.push({
          critic_id: criticId,
          item_id: itemId,
          verdict: describe(f.fund, h, stance, pct, quarter, priorShares),
          score: null,
          score_original: null,
          stance,
          source_platform: "SEC EDGAR",
          source_title: `${f.fund} 13F-HR — ${quarter}`,
          source_url: sourceUrl,
          published_on: filing.filingDate,
          position_details: {
            cusip: h.cusip,
            shares: h.shares,
            prior_shares: priorShares,
            value_usd: h.value,
            portfolio_pct: Number(pct.toFixed(4)),
            quarter,
            report_date: filing.reportDate,
          },
        });
      }

      for (let j = 0; j < rows.length; j += 200) {
        const { error } = await sb.from("takes").insert(rows.slice(j, j + 200));
        if (error) throw new Error(`takes insert: ${error.message}`);
      }
      totalTakes += rows.length;
      console.log(`    ${quarter}: ${rows.length} takes`);
    }
  }

  console.log(`\nDone. ${totalItems} new stock items, ${totalTakes} takes.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
