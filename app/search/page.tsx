import type { Metadata } from "next";
import Link from "next/link";
import { getCategoryStats, getCities, searchItems, FOOD } from "@/lib/data";
import { parseQuery, type ParsedQuery } from "@/lib/curate";
import { FOOD_SUBTYPES } from "@/lib/categories";
import { SearchBar } from "@/components/SearchBar";
import { FilterBar } from "@/components/FilterBar";
import { ItemCard } from "@/components/ItemCard";
import { RequestZeroState } from "@/components/RequestZeroState";

type SP = Promise<{ [k: string]: string | string[] | undefined }>;

function one(v: string | string[] | undefined): string | undefined {
  const s = Array.isArray(v) ? v[0] : v;
  return s && s.trim() ? s.trim() : undefined;
}

export async function generateMetadata({ searchParams }: { searchParams: SP }): Promise<Metadata> {
  const sp = await searchParams;
  const q = one(sp.q);
  return { title: q ? `“${q}”` : "Search" };
}

export default async function SearchPage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const q = one(sp.q);
  const categorySlug = one(sp.category) ?? FOOD;
  const paramCity = one(sp.city);
  const paramSubtype = one(sp.subtype);
  const paramCuisine = one(sp.cuisine);
  const paramPrice = one(sp.price);

  const stats = await getCategoryStats();
  const isFood = categorySlug === FOOD;

  // Only food has a city/subtype taxonomy to parse a natural-language query into.
  const cityNames = isFood ? (await getCities()).map((c) => c.city) : [];
  const parsed: ParsedQuery | null = q && isFood ? parseQuery(q, cityNames) : null;

  const effCity = paramCity ?? parsed?.city ?? undefined;
  const effSubtype = paramSubtype ?? parsed?.subtype ?? undefined;
  let effCuisine = paramCuisine ?? undefined;
  let broad: string | undefined;

  if (!isFood) {
    broad = q;
  } else if (q && !parsed?.city && !parsed?.subtype) {
    broad = q;
  } else if (parsed?.cuisine && !effCuisine && !effSubtype) {
    effCuisine = parsed.cuisine;
  }

  const results = await searchItems({
    q: broad,
    categorySlug,
    city: effCity,
    subtype: effSubtype,
    cuisine: effCuisine,
    price: paramPrice,
  });

  const summaryBits = [
    effSubtype,
    effCuisine ? `“${effCuisine}”` : null,
    effCity ? `in ${effCity}` : null,
    paramPrice,
  ].filter(Boolean);

  const hasQuery = !!(q || paramCity || paramSubtype || paramCuisine);

  const zeroParsed: ParsedQuery = parsed ?? {
    raw: q ?? [effSubtype, effCuisine, effCity].filter(Boolean).join(" "),
    subtype: (effSubtype as ParsedQuery["subtype"]) ?? null,
    city: effCity ?? null,
    cuisine: isFood ? effCuisine ?? null : q ?? null,
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <div className="mx-auto mb-6 max-w-2xl">
        <SearchBar variant="hero" defaultValue={q ?? ""} />
      </div>

      {/* Category tabs — search is scoped to one category at a time. */}
      <div className="mb-5 flex flex-wrap gap-2">
        {stats.map((c) => {
          const params = new URLSearchParams();
          if (q) params.set("q", q);
          if (c.slug !== FOOD) params.set("category", c.slug);
          const active = c.slug === categorySlug;
          return (
            <Link
              key={c.id}
              href={`/search?${params.toString()}`}
              className={`rounded-full border px-4 py-1.5 text-sm font-medium transition ${
                active
                  ? "border-flame bg-flame text-white"
                  : "border-line bg-paper text-ink-soft hover:border-ink/30 hover:text-ink"
              }`}
            >
              {c.name}
            </Link>
          );
        })}
      </div>

      <div className="mb-6 flex flex-col gap-3">
        {isFood && <FilterBar cities={cityNames} subtypes={[...FOOD_SUBTYPES]} />}
        <p className="text-sm text-ink-soft">
          {results.length > 0 ? (
            <>
              <span className="font-semibold text-ink">{results.length}</span>{" "}
              {results.length === 1 ? "result" : "results"}
              {summaryBits.length > 0 ? " " : ""}
              {summaryBits.join(" ")}
            </>
          ) : null}
        </p>
      </div>

      {results.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {results.map((v, i) => (
            <ItemCard key={v.id} item={v} categorySlug={categorySlug} rank={i + 1} />
          ))}
        </div>
      ) : hasQuery ? (
        <RequestZeroState categorySlug={categorySlug} parsed={zeroParsed} />
      ) : (
        <div className="rounded-card border border-line bg-paper p-10 text-center">
          <p className="font-display text-2xl text-ink">Search the critics&apos; picks</p>
          <p className="mt-2 text-ink-soft">
            Try a city, a cuisine, a stock, or a title — like “best pizza in New York”.
          </p>
        </div>
      )}
    </div>
  );
}
