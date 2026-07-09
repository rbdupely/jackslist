import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getVenuesByCitySlug } from "@/lib/data";
import { VenueCard } from "@/components/VenueCard";
import type { Venue } from "@/lib/types";

type Params = Promise<{ city: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { city } = await params;
  const venues = await getVenuesByCitySlug(city);
  const name = venues[0]?.city;
  return { title: name ? `Best of ${name}` : "City" };
}

export default async function CityPage({ params }: { params: Params }) {
  const { city } = await params;
  const venues = await getVenuesByCitySlug(city);
  if (venues.length === 0) notFound();

  const cityName = venues[0].city!;

  // Group by category; order groups by best score then size (venues within a
  // group already arrive ranked by jack_score, mention_count).
  const groups = new Map<string, Venue[]>();
  for (const v of venues) {
    const cat = v.category ?? "Other";
    const arr = groups.get(cat);
    if (arr) arr.push(v);
    else groups.set(cat, [v]);
  }
  const ordered = [...groups.entries()].sort((a, b) => {
    const sa = Math.max(...a[1].map((v) => v.jack_score ?? 0));
    const sb = Math.max(...b[1].map((v) => v.jack_score ?? 0));
    return sb - sa || b[1].length - a[1].length;
  });

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <header className="mb-10">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-flame">
          Jack&apos;s guide to
        </p>
        <h1 className="mt-2 font-display text-5xl font-semibold text-ink">{cityName}</h1>
        <p className="mt-2 text-ink-soft">
          {venues.length} {venues.length === 1 ? "spot" : "spots"} across {ordered.length}{" "}
          {ordered.length === 1 ? "category" : "categories"}.
        </p>
      </header>

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
                <VenueCard key={v.id} venue={v} rank={i + 1} />
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
