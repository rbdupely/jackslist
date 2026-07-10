import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getItemBySlug, getRelatedItems, FOOD } from "@/lib/data";
import { itemCuisine } from "@/lib/types";
import { ScoreBadge } from "@/components/ScoreBadge";
import { ItemMap } from "@/components/ItemMap";
import { TakeCard } from "@/components/TakeCard";
import { ItemCard } from "@/components/ItemCard";
import { ItemPhoto } from "@/components/ItemPhoto";
import { AdminEnrichButton } from "@/components/AdminEnrichButton";
import { createClient } from "@/lib/supabase/server";
import { isAdminEmail } from "@/lib/admin";
import { citySlug, formatScore } from "@/lib/util";

type Params = Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const data = await getItemBySlug(FOOD, slug);
  if (!data) return { title: "Not found" };
  const { item } = data;
  return {
    title: item.name,
    description:
      item.metadata?.blurb ??
      `${item.name} — a critic's pick in ${item.city ?? "town"}. Score ${item.top_score}/10.`,
  };
}

export default async function FoodItemPage({ params }: { params: Params }) {
  const { slug } = await params;
  const data = await getItemBySlug(FOOD, slug);
  if (!data) notFound();

  const { item, takes } = data;
  const related = await getRelatedItems(item, 6);
  const meta = [item.subtype, itemCuisine(item)].filter(Boolean).join(" · ");

  const sb = await createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  const isAdmin = isAdminEmail(user?.email);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <nav className="mb-5 text-sm text-ink-soft">
        <Link href="/" className="hover:text-ink">
          Home
        </Link>
        {item.city && (
          <>
            {" / "}
            <Link href={`/city/${citySlug(item.city)}`} className="hover:text-ink">
              {item.city}
            </Link>
          </>
        )}
      </nav>

      {/* Hero */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-[1.3fr_1fr]">
        <div>
          <div className="flex items-start gap-4">
            <ScoreBadge score={item.top_score} size="xl" />
            <div>
              <h1 className="font-display text-4xl font-semibold leading-tight text-ink sm:text-5xl">
                {item.name}
              </h1>
              <p className="mt-2 text-ink-soft">
                {meta}
                {item.price_tier ? ` · ${item.price_tier}` : ""}
              </p>
              {item.city && (
                <p className="text-sm text-ink-soft">
                  {item.neighborhood ? `${item.neighborhood}, ` : ""}
                  {item.city}
                  {item.country ? `, ${item.country}` : ""}
                </p>
              )}
            </div>
          </div>

          {item.metadata?.blurb && (
            <p className="mt-6 font-display text-2xl leading-snug text-ink">
              {item.metadata.blurb}
            </p>
          )}

          <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
            {item.take_count > 1 && (
              <span className="rounded-full bg-flame px-3 py-1 font-semibold text-white">
                Featured {item.take_count}×
              </span>
            )}
            {/* Consensus only exists once two or more critics have scored it. */}
            {item.consensus_score != null && (
              <span className="inline-flex items-center gap-2 rounded-full border border-line bg-paper px-3 py-1 font-medium text-ink">
                Critics&apos; consensus
                <span className="font-display font-semibold text-flame">
                  {formatScore(item.consensus_score)}
                </span>
                <span className="text-ink-soft">
                  · {item.scored_critic_count} critics
                </span>
              </span>
            )}
            {/* The crowd baseline is reference text, never styled like a take. */}
            {item.crowd_score != null && (
              <span className="text-xs text-ink-soft">
                {item.crowd_source} {item.crowd_score}
                {item.crowd_scale === "0-5" ? "★" : ""}
              </span>
            )}
          </div>
        </div>

        <div className="relative aspect-[4/3] overflow-hidden rounded-card border border-line">
          <ItemPhoto item={item} sizes="(max-width: 768px) 100vw, 40vw" />
        </div>
      </div>

      {/* Body */}
      <div className="mt-10 grid grid-cols-1 gap-10 lg:grid-cols-[1.6fr_1fr]">
        <section>
          <h2 className="mb-4 font-display text-2xl font-semibold text-ink">
            The takes
            <span className="ml-2 text-base font-normal text-ink-soft">
              {takes.length} from {item.critic_count}{" "}
              {item.critic_count === 1 ? "critic" : "critics"}
            </span>
          </h2>
          <div className="space-y-4">
            {takes.map((t) => (
              <TakeCard key={t.id} take={t} />
            ))}
          </div>
        </section>

        <aside className="lg:sticky lg:top-20 lg:self-start">
          <h2 className="mb-4 font-display text-2xl font-semibold text-ink">Find it</h2>
          <ItemMap item={item} />
          {isAdmin && <AdminEnrichButton slug={item.slug} />}
        </aside>
      </div>

      {related.length > 0 && item.city && (
        <section className="mt-14">
          <div className="mb-5 flex items-end justify-between">
            <h2 className="font-display text-2xl font-semibold text-ink">
              More in {item.city}
            </h2>
            <Link
              href={`/city/${citySlug(item.city)}`}
              className="text-sm font-medium text-flame hover:underline"
            >
              See all →
            </Link>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {related.map((v) => (
              <ItemCard key={v.id} item={v} categorySlug={FOOD} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
