import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getItemsByCitySlug, FOOD } from "@/lib/data";
import { ItemCard } from "@/components/ItemCard";
import { MapExplorer, type MapPoint } from "@/components/map/MapExplorer";
import type { ScoredItem } from "@/lib/types";

type Params = Promise<{ city: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { city } = await params;
  const items = await getItemsByCitySlug(city);
  const name = items[0]?.city;
  return { title: name ? `Best of ${name}` : "City" };
}

export default async function CityPage({ params }: { params: Params }) {
  const { city } = await params;
  const items = await getItemsByCitySlug(city);
  if (items.length === 0) notFound();

  const cityName = items[0].city!;

  // Every spot we have coordinates for, as score-colored map pins.
  const points: MapPoint[] = items
    .filter((v) => v.lat != null && v.lng != null)
    .map((v) => ({
      lat: v.lat as number,
      lng: v.lng as number,
      name: v.name,
      href: `/${FOOD}/${v.slug}`,
      score: v.top_score,
      meta: v.subtype,
    }));

  // Group by subtype; groups ordered by best score then size (items within a
  // group already arrive ranked by top_score, take_count).
  const groups = new Map<string, ScoredItem[]>();
  for (const v of items) {
    const cat = v.subtype ?? "Other";
    const arr = groups.get(cat);
    if (arr) arr.push(v);
    else groups.set(cat, [v]);
  }
  const ordered = [...groups.entries()].sort((a, b) => {
    const sa = Math.max(...a[1].map((v) => v.top_score ?? 0));
    const sb = Math.max(...b[1].map((v) => v.top_score ?? 0));
    return sb - sa || b[1].length - a[1].length;
  });

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <header className="mb-10">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-flame">
          The critics&apos; guide to
        </p>
        <h1 className="mt-2 font-display text-5xl font-semibold text-ink">{cityName}</h1>
        <p className="mt-2 text-ink-soft">
          {items.length} {items.length === 1 ? "spot" : "spots"} across {ordered.length}{" "}
          {ordered.length === 1 ? "category" : "categories"}.
        </p>
      </header>

      {points.length > 0 && (
        <section className="mb-12">
          <MapExplorer
            points={points}
            heightClass="h-[420px]"
            className="rounded-card border border-line shadow-e1"
          />
          <p className="mt-2 text-xs text-ink-soft">
            Pins colored by top score · click one for the verdict
          </p>
        </section>
      )}

      <div className="space-y-12">
        {ordered.map(([cat, list]) => (
          <section key={cat}>
            <div className="mb-4 flex items-baseline gap-3">
              <h2 className="font-display text-2xl font-semibold text-ink">
                Best {cat} in {cityName}
              </h2>
              <span className="text-sm text-ink-soft">{list.length}</span>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {list.map((v, i) => (
                <ItemCard key={v.id} item={v} categorySlug={FOOD} rank={i + 1} />
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
