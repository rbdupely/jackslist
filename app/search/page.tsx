import type { Metadata } from "next";
import { getCities, searchVenues } from "@/lib/data";
import { parseQuery, type ParsedQuery } from "@/lib/curate";
import { CATEGORIES } from "@/lib/categories";
import { SearchBar } from "@/components/SearchBar";
import { FilterBar } from "@/components/FilterBar";
import { VenueCard } from "@/components/VenueCard";
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
  const paramCity = one(sp.city);
  const paramCategory = one(sp.category);
  const paramCuisine = one(sp.cuisine);
  const paramPrice = one(sp.price);

  const cityInfos = await getCities();
  const cityNames = cityInfos.map((c) => c.city);

  // Derive structured filters from the free-text query when present.
  const parsed: ParsedQuery | null = q ? parseQuery(q, cityNames) : null;
  const effCity = paramCity ?? parsed?.city ?? undefined;
  const effCategory = paramCategory ?? parsed?.category ?? undefined;
  let effCuisine = paramCuisine ?? undefined;
  let broad: string | undefined;

  if (q && !parsed?.city && !parsed?.category) {
    broad = q; // pure text query -> broad name/cuisine match
  } else if (parsed?.cuisine && !effCuisine && !effCategory) {
    effCuisine = parsed.cuisine;
  }

  const results = await searchVenues({
    q: broad,
    city: effCity,
    category: effCategory,
    cuisine: effCuisine,
    price: paramPrice,
  });

  const summaryBits = [
    effCategory,
    effCuisine ? `“${effCuisine}”` : null,
    effCity ? `in ${effCity}` : null,
    paramPrice,
  ].filter(Boolean);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <div className="mx-auto mb-6 max-w-2xl">
        <SearchBar variant="hero" defaultValue={q ?? ""} />
      </div>

      <div className="mb-6 flex flex-col gap-3">
        <FilterBar cities={cityNames} categories={[...CATEGORIES]} />
        <p className="text-sm text-ink-soft">
          {results.length > 0 ? (
            <>
              <span className="font-semibold text-ink">{results.length}</span>{" "}
              {results.length === 1 ? "place" : "places"}
              {summaryBits.length > 0 ? " " : ""}
              {summaryBits.join(" ")}
            </>
          ) : null}
        </p>
      </div>

      {results.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {results.map((v, i) => (
            <VenueCard key={v.id} venue={v} rank={i + 1} />
          ))}
        </div>
      ) : q || paramCity || paramCategory || paramCuisine ? (
        <RequestZeroState
          parsed={
            parsed ?? {
              raw: q ?? [effCategory, effCuisine, effCity].filter(Boolean).join(" "),
              category: (effCategory as ParsedQuery["category"]) ?? null,
              city: effCity ?? null,
              cuisine: effCuisine ?? null,
            }
          }
        />
      ) : (
        <div className="rounded-card border border-line bg-paper p-10 text-center">
          <p className="font-display text-2xl text-ink">Search Jack&apos;s recommendations</p>
          <p className="mt-2 text-ink-soft">
            Try a city, a cuisine, or a dish — like “best pizza in New York”.
          </p>
        </div>
      )}
    </div>
  );
}
