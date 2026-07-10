-- OnlyCritics — migration 0001
-- Generalizes Jackslist (one food critic) into a multi-critic, multi-category model.
--
-- Additive and idempotent. Does NOT drop venues/mentions — that happens in
-- 0002_drop_legacy.sql only after the app is verified on the new tables.
--
-- Run in the Supabase SQL editor. Expected invariant afterwards:
--   303 items, 363 takes, 1 critic, 5 categories.

begin;

-- ---------------------------------------------------------------------------
-- categories
-- ---------------------------------------------------------------------------
create table if not exists public.categories (
  id         uuid primary key default gen_random_uuid(),
  slug       text not null unique,
  name       text not null,
  item_noun  text not null,
  created_at timestamptz not null default now()
);

insert into public.categories (slug, name, item_noun) values
  ('food',   'Food',               'spot'),
  ('gaming', 'Gaming',             'game'),
  ('stocks', 'Stocks & Investing', 'stock'),
  ('books',  'Books',              'book'),
  ('movies', 'Movies',             'movie')
on conflict (slug) do nothing;

-- ---------------------------------------------------------------------------
-- critics
-- ---------------------------------------------------------------------------
create table if not exists public.critics (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique,
  name        text not null,
  category_id uuid not null references public.categories(id) on delete restrict,
  platform    text,
  source_url  text,
  avatar_url  text,
  bio         text,
  -- 'numeric' critics give a score; 'stance' critics only give a verdict.
  score_style text not null default 'numeric' check (score_style in ('numeric','stance')),
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- items  (generalizes venues)
--   subtype  = the in-category taxonomy: Pizza / RPG / Semiconductors / Memoir
--   metadata = category-specific extras (food: cuisine; movies: runtime; ...)
--   legacy_venue_id is a migration aid, dropped in 0002.
-- ---------------------------------------------------------------------------
create table if not exists public.items (
  id            uuid primary key default gen_random_uuid(),
  category_id   uuid not null references public.categories(id) on delete restrict,
  slug          text not null,
  name          text not null,
  subtype       text,
  creator       text,                 -- author / director / developer (null for food, stocks)
  year          int,
  city          text,
  neighborhood  text,
  country       text,
  price_tier    text,
  lat           double precision,
  lng           double precision,
  photo_url     text,
  external_ids  jsonb not null default '{}'::jsonb,   -- {google_place_id, ticker, isbn, tmdb_id, ...}

  -- The crowd baseline (Metacritic / Goodreads / RT). Reference only, never a critic take.
  crowd_score   numeric,
  crowd_scale   text,                 -- '0-100' | '0-5' | '0-10' | '%'
  crowd_source  text,
  crowd_url     text,

  metadata      jsonb not null default '{}'::jsonb,

  -- Google Places enrichment (food; nullable everywhere else)
  address       text,
  google_rating numeric(2,1),
  maps_url      text,
  hours         jsonb,
  enriched_at   timestamptz,

  legacy_venue_id uuid,
  created_at    timestamptz not null default now(),

  -- Slugs are unique per category, so "dune" can be both a book and a movie.
  unique (category_id, slug)
);

-- ---------------------------------------------------------------------------
-- takes  (generalizes mentions)
-- ---------------------------------------------------------------------------
create table if not exists public.takes (
  id               uuid primary key default gen_random_uuid(),
  critic_id        uuid not null references public.critics(id) on delete cascade,
  item_id          uuid not null references public.items(id) on delete cascade,
  verdict          text,                 -- short attributed quote (<= 30 words)
  score            numeric(3,1),         -- normalized 0-10; null for stance-only critics
  score_original   text,                 -- 'B+', 'Buy', '8.1/10' — always shown near the number
  stance           text,                 -- media: rave/positive/mixed/negative
                                         -- stocks: new_buy/added/trimmed/exited/holds/called_out
  highlights       text,                 -- the dish / the standout track / the thesis
  superlatives     text,
  best_of_language boolean default false,
  source_platform  text,
  source_title     text,
  source_url       text,
  timestamp_sec    int,
  published_on     date,
  position_details jsonb,                -- stocks: {shares, portfolio_pct, quarter}
  metadata         jsonb not null default '{}'::jsonb,
  created_at       timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- follows
-- ---------------------------------------------------------------------------
create table if not exists public.follows (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  critic_id  uuid not null references public.critics(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, critic_id)
);

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------
create index if not exists items_category_idx     on public.items (category_id);
create index if not exists items_subtype_idx      on public.items (category_id, subtype);
create index if not exists items_city_idx         on public.items (lower(city));
create index if not exists items_legacy_idx       on public.items (legacy_venue_id);
create index if not exists takes_item_idx         on public.takes (item_id);
create index if not exists takes_critic_idx       on public.takes (critic_id);
create index if not exists takes_critic_item_idx  on public.takes (critic_id, item_id);
create index if not exists critics_category_idx   on public.critics (category_id);
create index if not exists follows_user_idx       on public.follows (user_id);

-- ---------------------------------------------------------------------------
-- Backfill: venues -> items, mentions -> takes
-- ---------------------------------------------------------------------------

-- The first critic.
insert into public.critics (slug, name, category_id, platform, source_url, score_style, bio)
select 'jacks-dining-room', 'Jack''s Dining Room', c.id, 'YouTube',
       'https://www.youtube.com/@jacksdiningroom', 'numeric',
       'Food and travel creator reviewing the best places to eat, city by city.'
from public.categories c where c.slug = 'food'
on conflict (slug) do nothing;

-- venues -> items.
--   subtype  <- venues.category  (the 15-value taxonomy: Pizza, BBQ, Deli, ...)
--   metadata <- venues.cuisine_type (223-value free-text descriptor)
insert into public.items (
  category_id, slug, name, subtype, city, neighborhood, country, price_tier,
  lat, lng, photo_url, external_ids, metadata,
  address, google_rating, maps_url, hours, enriched_at,
  legacy_venue_id, created_at
)
select
  (select id from public.categories where slug = 'food'),
  v.slug, v.name, v.category, v.city, v.neighborhood, v.country, v.price_tier,
  v.lat, v.lng, v.google_photo_url,
  jsonb_strip_nulls(jsonb_build_object('google_place_id', v.google_place_id)),
  jsonb_strip_nulls(jsonb_build_object('cuisine', v.cuisine_type, 'blurb', v.jack_blurb)),
  v.address, v.google_rating, v.maps_url, v.hours, v.enriched_at,
  v.id, v.created_at
from public.venues v
where not exists (select 1 from public.items i where i.legacy_venue_id = v.id);

-- mentions -> takes.
insert into public.takes (
  critic_id, item_id, verdict, score, score_original, stance,
  highlights, superlatives, best_of_language,
  source_platform, source_title, source_url, timestamp_sec, published_on,
  metadata, created_at
)
select
  (select id from public.critics where slug = 'jacks-dining-room'),
  i.id,
  m.verdict,
  m.score,
  case when m.score is not null then m.score::text || '/10' end,
  case lower(coalesce(m.sentiment, ''))
    when 'positive' then 'positive'
    when 'mixed'    then 'mixed'
    when 'negative' then 'negative'
    else null
  end,
  coalesce(nullif(m.must_order, ''), m.dishes_called_out),
  m.superlatives,
  coalesce(m.best_of_language, false),
  m.source_platform, m.source_title, m.source_url, m.timestamp_sec, m.publish_date,
  jsonb_strip_nulls(jsonb_build_object(
    'rec_id', m.rec_id,
    'dishes_called_out', m.dishes_called_out,
    'timestamp_label', m.timestamp_label
  )),
  m.created_at
from public.mentions m
join public.items i on i.legacy_venue_id = m.venue_id
where not exists (
  select 1 from public.takes t
  where t.item_id = i.id and t.metadata->>'rec_id' = m.rec_id
);

-- ---------------------------------------------------------------------------
-- requests: add category + subject, repoint filled venue -> item
-- ---------------------------------------------------------------------------
alter table public.requests add column if not exists category_id uuid references public.categories(id);
alter table public.requests add column if not exists subject text;

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='requests' and column_name='filled_venue_id'
  ) then
    alter table public.requests drop constraint if exists requests_filled_venue_id_fkey;
    alter table public.requests rename column filled_venue_id to filled_item_id;
  end if;
end $$;

alter table public.requests drop constraint if exists requests_filled_item_id_fkey;
alter table public.requests
  add constraint requests_filled_item_id_fkey
  foreign key (filled_item_id) references public.items(id) on delete set null;

-- Backfill the two legacy rows into the new key format: category|subject|qualifier
update public.requests
  set category_id = (select id from public.categories where slug='food')
  where category_id is null;

update public.requests
  set subject = coalesce(nullif(category,''), nullif(cuisine,''), query_text)
  where subject is null;

update public.requests r
  set normalized_key = 'food|'
    || lower(coalesce(nullif(r.category,''), nullif(r.cuisine,''), ''))
    || '|' || lower(coalesce(r.city,''))
  where r.normalized_key not like 'food|%'
    and not exists (
      select 1 from public.requests o
      where o.id <> r.id
        and o.normalized_key = 'food|'
          || lower(coalesce(nullif(r.category,''), nullif(r.cuisine,''), ''))
          || '|' || lower(coalesce(r.city,''))
    );

update public.requests set status = 'Covered' where status = 'Filmed';

-- ---------------------------------------------------------------------------
-- Views
--   critic_item_scores : one representative (latest scored) take per critic+item
--   items_scored       : items.* plus take_count, critic_count, top_score, consensus
--                        (consensus only when >= 2 critics scored the item)
-- ---------------------------------------------------------------------------
drop view if exists public.items_scored;
drop view if exists public.critic_item_scores;

create view public.critic_item_scores with (security_invoker = true) as
select distinct on (t.item_id, t.critic_id)
  t.item_id,
  t.critic_id,
  t.score,
  t.score_original,
  t.stance,
  t.published_on,
  t.source_url
from public.takes t
order by t.item_id, t.critic_id, t.published_on desc nulls last, t.created_at desc;

create view public.items_scored with (security_invoker = true) as
select
  i.*,
  coalesce(agg.take_count, 0)         as take_count,
  coalesce(agg.critic_count, 0)       as critic_count,
  agg.top_score,
  case when agg.scored_critic_count >= 2 then round(agg.avg_score, 1) end as consensus_score,
  coalesce(agg.scored_critic_count, 0) as scored_critic_count
from public.items i
left join lateral (
  select
    (select count(*) from public.takes t where t.item_id = i.id)                    as take_count,
    (select count(distinct t.critic_id) from public.takes t where t.item_id = i.id) as critic_count,
    (select count(*) from public.critic_item_scores c
       where c.item_id = i.id and c.score is not null)                              as scored_critic_count,
    (select max(c.score) from public.critic_item_scores c
       where c.item_id = i.id)                                                      as top_score,
    (select avg(c.score) from public.critic_item_scores c
       where c.item_id = i.id and c.score is not null)                              as avg_score
) agg on true;

-- ---------------------------------------------------------------------------
-- RLS: public read on the catalog; a user owns only their follows.
-- ---------------------------------------------------------------------------
alter table public.categories enable row level security;
alter table public.critics    enable row level security;
alter table public.items      enable row level security;
alter table public.takes      enable row level security;
alter table public.follows    enable row level security;

drop policy if exists "public read categories" on public.categories;
create policy "public read categories" on public.categories for select using (true);

drop policy if exists "public read critics" on public.critics;
create policy "public read critics" on public.critics for select using (true);

drop policy if exists "public read items" on public.items;
create policy "public read items" on public.items for select using (true);

drop policy if exists "public read takes" on public.takes;
create policy "public read takes" on public.takes for select using (true);

drop policy if exists "user reads own follows" on public.follows;
create policy "user reads own follows" on public.follows
  for select using (auth.uid() = user_id);

drop policy if exists "user inserts own follow" on public.follows;
create policy "user inserts own follow" on public.follows
  for insert with check (auth.uid() = user_id);

drop policy if exists "user deletes own follow" on public.follows;
create policy "user deletes own follow" on public.follows
  for delete using (auth.uid() = user_id);

grant select on public.items_scored, public.critic_item_scores to anon, authenticated;

-- ---------------------------------------------------------------------------
-- RPC: category-aware zero-result search -> request.
--   New name so the live app keeps working until it is repointed and redeployed.
--   The old record_request() is dropped in 0002.
--   upvote_request(uuid) needs no change: it never referenced a category.
-- ---------------------------------------------------------------------------
create or replace function public.record_request_v2(
  p_category_slug text,
  p_subject       text,
  p_qualifier     text,
  p_query         text
) returns public.requests
language plpgsql
security definer
set search_path = public
as $$
declare
  r   public.requests;
  cid uuid;
  key text;
begin
  select id into cid from public.categories where slug = p_category_slug;
  if cid is null then
    raise exception 'unknown category: %', p_category_slug;
  end if;

  key := lower(coalesce(p_category_slug,'')) || '|'
      || lower(coalesce(p_subject,''))       || '|'
      || lower(coalesce(p_qualifier,''));

  insert into public.requests (normalized_key, query_text, category_id, subject, city)
  values (key, p_query, cid, p_subject, nullif(p_qualifier,''))
  on conflict (normalized_key) do update
    set search_count = requests.search_count + 1,
        upvotes      = requests.upvotes + 1
  returning * into r;

  return r;
end;
$$;

grant execute on function public.record_request_v2(text, text, text, text) to anon, authenticated;

commit;

-- ---------------------------------------------------------------------------
-- Verification — expect: items 303 | takes 363 | critics 1 | categories 5
--                        orphan_takes 0 | slug_mismatch 0
-- ---------------------------------------------------------------------------
select
  (select count(*) from public.items)      as items,
  (select count(*) from public.takes)      as takes,
  (select count(*) from public.critics)    as critics,
  (select count(*) from public.categories) as categories,
  (select count(*) from public.takes t
     left join public.items i on i.id = t.item_id where i.id is null) as orphan_takes,
  (select count(*) from public.venues v
     left join public.items i on i.legacy_venue_id = v.id
     where i.id is null or i.slug <> v.slug) as slug_mismatch;
