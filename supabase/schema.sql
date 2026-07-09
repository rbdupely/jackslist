-- Jackslist — Supabase schema
-- Run this in the Supabase SQL Editor (or `supabase db push`) before seeding.
-- Safe to re-run: drops are guarded and policies are recreated.

-- ---------------------------------------------------------------------------
-- Extensions
-- ---------------------------------------------------------------------------
create extension if not exists "pgcrypto";      -- gen_random_uuid()

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

-- venues: one row per unique place Jack has featured
create table if not exists public.venues (
  id               uuid primary key default gen_random_uuid(),
  name             text not null,
  slug             text not null unique,
  category         text,                 -- normalized primary category
  cuisine_type     text,
  city             text,
  neighborhood     text,
  country          text,
  price_tier       text,                 -- $, $$, $$$, $$$$
  jack_score       numeric(3,1),         -- 0..10, venue's best/representative score
  mention_count    int not null default 0,
  jack_blurb       text,                 -- short Jack-voice description (Phase 4)

  -- Google Places enrichment (Phase 3, all nullable)
  google_place_id  text,
  address          text,
  lat              double precision,
  lng              double precision,
  google_rating    numeric(2,1),
  google_photo_url text,
  maps_url         text,
  hours            jsonb,                -- opening hours payload from Places
  enriched_at      timestamptz,

  created_at       timestamptz not null default now()
);

-- mentions: one row per time Jack featured a venue (a venue may have many)
create table if not exists public.mentions (
  id                uuid primary key default gen_random_uuid(),
  venue_id          uuid not null references public.venues(id) on delete cascade,
  rec_id            text,                -- original CSV Rec ID (for traceability)
  verdict           text,               -- his quote / take
  sentiment         text,               -- Positive / Mixed / Negative
  dishes_called_out text,
  must_order        text,
  superlatives      text,
  best_of_language  boolean default false,
  source_platform   text,               -- "YouTube (long-form)" / "YouTube (Short)"
  source_title      text,
  source_url        text,
  timestamp_sec     int,                -- seconds into the video (nullable)
  timestamp_label   text,               -- original timestamp string if present
  publish_date      date,
  score             numeric(3,1),
  created_at        timestamptz not null default now()
);

-- requests: the gap / upvote system (Phase 5)
create table if not exists public.requests (
  id             uuid primary key default gen_random_uuid(),
  query_text     text,
  city           text,
  category       text,
  cuisine        text,
  normalized_key text not null unique,   -- city|category|cuisine (lowercased)
  upvotes        int not null default 1,
  search_count   int not null default 1, -- times it surfaced as a zero-result search
  status         text not null default 'Requested',  -- Requested / Planned / Filmed
  filled_venue_id uuid references public.venues(id) on delete set null,
  created_at     timestamptz not null default now()
);

-- request_votes: one vote per user per request
create table if not exists public.request_votes (
  id         uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.requests(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (request_id, user_id)
);

-- ---------------------------------------------------------------------------
-- Indexes (search/filter/sort paths)
-- ---------------------------------------------------------------------------
create index if not exists venues_city_idx        on public.venues (lower(city));
create index if not exists venues_category_idx     on public.venues (category);
create index if not exists venues_cuisine_idx      on public.venues (lower(cuisine_type));
create index if not exists venues_score_idx        on public.venues (jack_score desc, mention_count desc);
create index if not exists mentions_venue_idx      on public.mentions (venue_id);
create index if not exists requests_upvotes_idx    on public.requests (upvotes desc);
create index if not exists request_votes_user_idx  on public.request_votes (user_id);

-- ---------------------------------------------------------------------------
-- Row Level Security
--   Public (anon) read on venues/mentions/requests.
--   Votes: a signed-in user may read all votes but only insert/delete their own.
-- ---------------------------------------------------------------------------
alter table public.venues        enable row level security;
alter table public.mentions      enable row level security;
alter table public.requests      enable row level security;
alter table public.request_votes enable row level security;

drop policy if exists "public read venues"   on public.venues;
create policy "public read venues"   on public.venues   for select using (true);

drop policy if exists "public read mentions" on public.mentions;
create policy "public read mentions" on public.mentions for select using (true);

drop policy if exists "public read requests" on public.requests;
create policy "public read requests" on public.requests for select using (true);

drop policy if exists "public read votes"    on public.request_votes;
create policy "public read votes"    on public.request_votes for select using (true);

drop policy if exists "user inserts own vote" on public.request_votes;
create policy "user inserts own vote" on public.request_votes
  for insert with check (auth.uid() = user_id);

drop policy if exists "user deletes own vote" on public.request_votes;
create policy "user deletes own vote" on public.request_votes
  for delete using (auth.uid() = user_id);

-- Writes to venues/mentions/requests are performed by the service role (seed,
-- enrichment, admin) which bypasses RLS, or by the SECURITY DEFINER functions
-- below. No public insert/update policies are granted on purpose.

-- ---------------------------------------------------------------------------
-- RPC: record a zero-result search as a request (create or bump).
--   SECURITY DEFINER so the anon client can call it without a write policy.
-- ---------------------------------------------------------------------------
create or replace function public.record_request(
  p_key      text,
  p_query    text,
  p_city     text,
  p_category text,
  p_cuisine  text
) returns public.requests
language plpgsql
security definer
set search_path = public
as $$
declare
  r public.requests;
begin
  insert into public.requests (normalized_key, query_text, city, category, cuisine)
  values (p_key, p_query, p_city, p_category, p_cuisine)
  on conflict (normalized_key) do update
    set search_count = requests.search_count + 1,
        upvotes      = requests.upvotes + 1
  returning * into r;
  return r;
end;
$$;

-- ---------------------------------------------------------------------------
-- RPC: cast a logged-in upvote (one per user). Returns the new upvote count.
--   SECURITY DEFINER so it can bump requests.upvotes atomically with the vote.
-- ---------------------------------------------------------------------------
create or replace function public.upvote_request(p_request_id uuid)
returns table (upvotes int, counted boolean)
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  ins_count int := 0;
  new_count int;
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;

  insert into public.request_votes (request_id, user_id)
  values (p_request_id, uid)
  on conflict (request_id, user_id) do nothing;

  get diagnostics ins_count = row_count;

  if ins_count > 0 then
    update public.requests
      set upvotes = upvotes + 1
      where id = p_request_id
      returning upvotes into new_count;
  else
    select r.upvotes into new_count from public.requests r where r.id = p_request_id;
  end if;

  return query select new_count, (ins_count > 0);
end;
$$;

grant execute on function public.record_request(text, text, text, text, text) to anon, authenticated;
grant execute on function public.upvote_request(uuid) to authenticated;
