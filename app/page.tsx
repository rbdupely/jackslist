import Link from "next/link";
import {
  getAllCritics,
  getAllItems,
  getCategoryStats,
  getCities,
  getFollowedCriticIds,
  FOOD,
} from "@/lib/data";
import { homeFeaturedLists } from "@/lib/curate";
import { SearchBar } from "@/components/SearchBar";
import { CuratedListCard } from "@/components/CuratedListCard";
import { CriticCard } from "@/components/CriticCard";

const EXAMPLES = ["Best pizza in New York", "Tokyo", "Sandwiches in Florence", "BBQ"];

const TILE_COPY: Record<string, string> = {
  food: "Not the Yelp average — the palate you trust.",
  stocks: "Not an index fund — what they actually disclosed.",
  books: "Not the Goodreads average — the reader you trust.",
  gaming: "Not IGN — the reviewer.",
  movies: "Not Rotten Tomatoes — the critic.",
};

export default async function Home() {
  const [stats, critics, following, items, cities] = await Promise.all([
    getCategoryStats(),
    getAllCritics(),
    getFollowedCriticIds(),
    getAllItems(FOOD),
    getCities(),
  ]);

  const lists = homeFeaturedLists(items).slice(0, 6);
  const followed = critics.filter((c) => following.has(c.id));
  const totalItems = stats.reduce((s, c) => s + c.itemCount, 0);
  const catBySlug = new Map(stats.map((s) => [s.id, s.slug]));

  return (
    <div>
      {/* Hero */}
      <section className="mx-auto max-w-4xl px-4 pb-10 pt-16 text-center sm:px-6 sm:pt-24">
        <p className="mb-4 text-sm font-semibold uppercase tracking-[0.2em] text-flame">
          Follow the person, not the average
        </p>
        <h1 className="font-display text-5xl font-semibold leading-[1.05] tracking-tight text-ink sm:text-6xl">
          Taste has a name.
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-lg text-ink-soft">
          Aggregate scores are noise. OnlyCritics tracks what specific, named people actually said
          — with the receipt. {totalItems} picks from {critics.length} critics.
        </p>

        <div className="mx-auto mt-8 max-w-2xl">
          <SearchBar variant="hero" />
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
          {EXAMPLES.map((ex) => (
            <Link
              key={ex}
              href={`/search?q=${encodeURIComponent(ex)}`}
              className="rounded-full border border-line bg-paper px-3.5 py-1.5 text-sm text-ink-soft transition hover:border-ink/30 hover:text-ink"
            >
              {ex}
            </Link>
          ))}
        </div>
      </section>

      {/* Categories */}
      <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <h2 className="mb-6 font-display text-3xl font-semibold text-ink">Categories</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {stats.map((c) => (
            <Link
              key={c.id}
              href={`/${c.slug}`}
              className="group flex flex-col rounded-card border border-line bg-paper p-5 transition hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/5"
            >
              <h3 className="font-display text-2xl font-semibold text-ink group-hover:text-flame">
                {c.name}
              </h3>
              <p className="mt-1 text-sm text-ink-soft">{TILE_COPY[c.slug]}</p>
              <p className="mt-4 text-sm font-medium text-ink-soft">
                {c.criticCount > 0 ? (
                  <>
                    {c.criticCount} {c.criticCount === 1 ? "critic" : "critics"} ·{" "}
                    {c.itemCount} {c.itemCount === 1 ? c.item_noun : `${c.item_noun}s`}
                  </>
                ) : (
                  <span className="text-ink-soft/70">No critics seeded yet</span>
                )}
              </p>
            </Link>
          ))}
        </div>
      </section>

      {/* Your critics */}
      {followed.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
          <h2 className="mb-6 font-display text-3xl font-semibold text-ink">Your critics</h2>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {followed.map((c) => (
              <CriticCard
                key={c.id}
                critic={c}
                categorySlug={catBySlug.get(c.category_id) ?? "food"}
                following
              />
            ))}
          </div>
        </section>
      )}

      {/* All critics */}
      <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <div className="mb-6 flex items-end justify-between">
          <h2 className="font-display text-3xl font-semibold text-ink">The critics</h2>
          <p className="hidden text-sm text-ink-soft sm:block">
            Every take on this site traces back to one of them
          </p>
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {critics.map((c) => (
            <CriticCard
              key={c.id}
              critic={c}
              categorySlug={catBySlug.get(c.category_id) ?? "food"}
              following={following.has(c.id)}
            />
          ))}
        </div>
      </section>

      {/* Featured lists (food) */}
      <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <div className="mb-6 flex items-end justify-between">
          <h2 className="font-display text-3xl font-semibold text-ink">Critics&apos; lists</h2>
          <p className="hidden text-sm text-ink-soft sm:block">
            Ranked by their score, then how often they go back
          </p>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {lists.map((list) => (
            <CuratedListCard key={list.title} list={list} />
          ))}
        </div>
      </section>

      {/* Cities */}
      <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <h2 className="mb-6 font-display text-3xl font-semibold text-ink">Browse by city</h2>
        <div className="flex flex-wrap gap-2.5">
          {cities.slice(0, 16).map((c) => (
            <Link
              key={c.slug}
              href={`/city/${c.slug}`}
              className="rounded-full border border-line bg-paper px-4 py-2 text-sm font-medium text-ink transition hover:border-flame hover:text-flame"
            >
              {c.city}
              <span className="ml-1.5 text-ink-soft">{c.count}</span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
