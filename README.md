# Jackslist

A Yelp-style discovery site built entirely on the recommendations of **Jack's
Dining Room**. Search a city, cuisine, or dish and get Jack's ranked picks; when
Jack hasn't covered something, that search becomes an upvote-able **request**
that tells him where to go next.

**Stack:** Next.js 16 (App Router, TypeScript) · Tailwind v4 · Supabase
(Postgres + magic-link auth) · Google Places/Maps · deploys to Vercel.

---

## Quick start

```bash
# 1. Install
npm install

# 2. Configure env
cp .env.local.example .env.local   # then fill in your Supabase values

# 3. Create the schema
#    Paste supabase/schema.sql into the Supabase SQL Editor and run it.

# 4. Seed venues + mentions from the CSV
node --env-file=.env.local scripts/seed.ts

# 5. Run
npm run dev        # http://localhost:3000
```

### Required env (`.env.local`)

| Var | Needed for |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | everything |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | everything |
| `SUPABASE_SERVICE_ROLE_KEY` | seed / enrich / admin (keep secret) |
| `ADMIN_EMAILS` | `/admin` access (comma-separated) |
| `GOOGLE_MAPS_API_KEY` | Phase 3 enrichment (Places) — server-side |
| `NEXT_PUBLIC_GOOGLE_MAPS_EMBED_KEY` | Phase 3 map embed (referrer-restricted) |
| `ANTHROPIC_API_KEY` | Phase 4 blurbs |

---

## Data model (`supabase/schema.sql`)

- **venues** — one row per unique place (name, category, cuisine, city, price,
  `jack_score`, `mention_count`, `jack_blurb`, + nullable Google fields).
- **mentions** — one row per time Jack featured a venue (verdict, sentiment,
  dishes, source video + timestamp, score).
- **requests** — the gap/upvote system (`normalized_key`, `upvotes`, `status`).
- **request_votes** — one vote per user per request (unique constraint).

RLS: public read on venues/mentions/requests; votes writable only by their
owner. Two `SECURITY DEFINER` RPCs power the demand loop: `record_request`
(logs a zero-result search) and `upvote_request` (one-per-user upvote).

---

## Scripts

```bash
# Seed (idempotent — clears + reloads from data/recommendations.csv)
node --env-file=.env.local scripts/seed.ts

# Phase 3 — Google Places enrichment (caches into the DB)
node --env-file=.env.local scripts/enrich.ts            # only un-enriched
node --env-file=.env.local scripts/enrich.ts --force    # re-enrich all
node --env-file=.env.local scripts/enrich.ts --limit 20 # test a handful

# Phase 4 — Jack-voice blurbs (Anthropic)
node --env-file=.env.local scripts/blurbs.ts --limit 10 # test
node --env-file=.env.local scripts/blurbs.ts            # all venues
```

Scripts run directly on Node 22+ (built-in TypeScript + `--env-file`), no build
step or extra runner needed.

---

## Routes

| Route | What |
| --- | --- |
| `/` | Hero search, curated lists, most-featured, cities |
| `/search?q=` | Filtered/ranked results; zero-results → request + upvote |
| `/venue/[slug]` | Score, blurb, every mention w/ video links, map, related |
| `/city/[city]` | All of Jack's venues in a city, grouped by category |
| `/requests` | Public upvote leaderboard (the roadmap) |
| `/login` | Magic-link sign-in |
| `/admin` | Move requests Requested → Planned → Filmed; link filmed venue |

---

## Google Maps setup (Phase 3)

Enable **Places API** (Text Search + Details) and **Maps Embed API**. Put the
Places key in `GOOGLE_MAPS_API_KEY` (server-only — photos are proxied through
`/api/place-photo` so the key is never exposed). Put a referrer-restricted key
in `NEXT_PUBLIC_GOOGLE_MAPS_EMBED_KEY` for the venue-page map embed. Everything
degrades gracefully (address + "Open in Maps" link) until keys are set.

## Supabase auth setup (Phase 5)

Add your dev/prod origins to **Auth → URL Configuration → Redirect URLs**:
`http://localhost:3000/auth/callback` and your Vercel URL's `/auth/callback`.

## Deploy (Vercel)

Import the repo, add the same env vars in the Vercel project, and set your
production URL in Supabase redirect URLs.
