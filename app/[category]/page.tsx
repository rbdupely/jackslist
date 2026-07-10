import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getAllItems,
  getCategoryBySlug,
  getCriticsByCategory,
  getFollowedCriticIds,
  getItemCount,
  getMappableItems,
} from "@/lib/data";
import { ItemCard } from "@/components/ItemCard";
import { CriticCard } from "@/components/CriticCard";
import { MapView, type MapPoint } from "@/components/map/MapView";

type Params = Promise<{ category: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { category } = await params;
  const cat = await getCategoryBySlug(category);
  return { title: cat ? cat.name : "Category" };
}

export default async function CategoryPage({ params }: { params: Params }) {
  const { category } = await params;
  const cat = await getCategoryBySlug(category);
  if (!cat) notFound();

  const [critics, items, following, mappable, itemTotal] = await Promise.all([
    getCriticsByCategory(cat.slug),
    getAllItems(cat.slug),
    getFollowedCriticIds(),
    getMappableItems(cat.slug),
    getItemCount(cat.slug),
  ]);

  const mostCovered = [...items].sort((a, b) => b.take_count - a.take_count).slice(0, 6);

  const points: MapPoint[] = mappable.map((m) => ({
    lat: m.lat,
    lng: m.lng,
    name: m.name,
    href: `/${cat.slug}/${m.slug}`,
    score: m.top_score,
    meta: [m.subtype, m.city].filter(Boolean).join(" · ") || null,
  }));

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <header className="mb-10">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-flame">
          Follow the person, not the average
        </p>
        <h1 className="mt-2 font-display text-5xl font-semibold text-ink">{cat.name}</h1>
        <p className="mt-2 text-ink-soft">
          {critics.length} {critics.length === 1 ? "critic" : "critics"} ·{" "}
          {itemTotal.toLocaleString()}{" "}
          {itemTotal === 1 ? cat.item_noun : `${cat.item_noun}s`} covered
        </p>
      </header>

      {critics.length === 0 ? (
        // An honest empty state. We don't invent critics or their opinions.
        <div className="rounded-card border border-line bg-paper p-10 text-center">
          <p className="font-display text-2xl text-ink">No critics seeded yet</p>
          <p className="mx-auto mt-2 max-w-lg text-ink-soft">
            We only publish takes we can trace to a real, citable source. The {cat.name.toLowerCase()}{" "}
            critics we want live inside video and behind sources we don&apos;t scrape — so this
            category stays empty until we can source them properly.
          </p>
          <Link
            href="/requests"
            className="mt-5 inline-block rounded-full bg-flame px-5 py-2.5 font-semibold text-white hover:bg-flame-dark"
          >
            Tell us who to add
          </Link>
        </div>
      ) : (
        <>
          {points.length > 0 && (
            <section className="mb-12">
              <div className="mb-4 flex items-baseline justify-between">
                <h2 className="font-display text-2xl font-semibold text-ink">Explore the map</h2>
                <span className="tnum text-sm text-ink-soft">
                  {points.length.toLocaleString()} rated spots
                </span>
              </div>
              <MapView
                points={points}
                cluster
                heightClass="h-[460px]"
                className="rounded-card border border-line shadow-e1"
              />
              <p className="mt-2 text-xs text-ink-soft">
                Every {cat.item_noun} a critic has rated, clustered — zoom in to a neighborhood,
                click a pin for the verdict. Pins colored by top score.
              </p>
            </section>
          )}

          <section className="mb-12">
            <h2 className="mb-4 font-display text-2xl font-semibold text-ink">The critics</h2>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {critics.map((c) => (
                <CriticCard
                  key={c.id}
                  critic={c}
                  categorySlug={cat.slug}
                  following={following.has(c.id)}
                />
              ))}
            </div>
          </section>

          <section>
            <div className="mb-4 flex items-end justify-between">
              <h2 className="font-display text-2xl font-semibold text-ink">Most covered</h2>
              <Link href="/search" className="text-sm font-medium text-flame hover:underline">
                Search all →
              </Link>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {mostCovered.map((v) => (
                <ItemCard key={v.id} item={v} categorySlug={cat.slug} />
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
