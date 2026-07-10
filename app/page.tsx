import Link from "next/link";
import { getAllItems, getCities, FOOD } from "@/lib/data";
import { homeFeaturedLists, mostFeatured } from "@/lib/curate";
import { SearchBar } from "@/components/SearchBar";
import { CuratedListCard } from "@/components/CuratedListCard";
import { ItemCard } from "@/components/ItemCard";

const EXAMPLES = [
  "Best pizza in New York",
  "Tokyo",
  "Sandwiches in Florence",
  "BBQ",
  "Steakhouse in Las Vegas",
];

export default async function Home() {
  const items = await getAllItems(FOOD);
  const lists = homeFeaturedLists(items);
  const featured = mostFeatured(items, 8);
  const cities = (await getCities()).slice(0, 16);
  const itemCount = items.length;
  const cityCount = new Set(items.map((v) => v.city).filter(Boolean)).size;

  return (
    <div>
      {/* Hero */}
      <section className="mx-auto max-w-4xl px-4 pb-10 pt-16 text-center sm:px-6 sm:pt-24">
        <p className="mb-4 text-sm font-semibold uppercase tracking-[0.2em] text-flame">
          A Yelp for one palate
        </p>
        <h1 className="font-display text-5xl font-semibold leading-[1.05] tracking-tight text-ink sm:text-6xl">
          Where Jack says <br className="hidden sm:block" />
          to eat.
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-lg text-ink-soft">
          Every place from <span className="font-medium text-ink">Jack&apos;s Dining Room</span> —
          ranked, with his verdict and the dish to get. {itemCount} spots across {cityCount} cities.
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

      {/* Featured lists */}
      <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <div className="mb-6 flex items-end justify-between">
          <h2 className="font-display text-3xl font-semibold text-ink">Jack&apos;s lists</h2>
          <p className="hidden text-sm text-ink-soft sm:block">
            Ranked by his score, then how often he goes back
          </p>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {lists.map((list) => (
            <CuratedListCard key={list.title} list={list} />
          ))}
        </div>
      </section>

      {/* Most featured */}
      {featured.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
          <div className="mb-6">
            <h2 className="font-display text-3xl font-semibold text-ink">Most featured</h2>
            <p className="mt-1 text-sm text-ink-soft">
              The places Jack keeps coming back to.
            </p>
          </div>
          <div className="-mx-4 flex snap-x gap-4 overflow-x-auto px-4 pb-2 no-scrollbar sm:mx-0 sm:px-0">
            {featured.map((v) => (
              <div key={v.id} className="w-72 shrink-0 snap-start">
                <ItemCard item={v} categorySlug={FOOD} />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Cities */}
      <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <h2 className="mb-6 font-display text-3xl font-semibold text-ink">Browse by city</h2>
        <div className="flex flex-wrap gap-2.5">
          {cities.map((c) => (
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
