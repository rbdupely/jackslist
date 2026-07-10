import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import {
  getCategories,
  getCriticBySlug,
  getCriticCatalog,
  getFollowedCriticIds,
} from "@/lib/data";
import { ItemCard } from "@/components/ItemCard";
import { FollowButton } from "@/components/FollowButton";
import { StanceChip } from "@/components/StanceChip";

type Params = Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const critic = await getCriticBySlug(slug);
  if (!critic) return { title: "Not found" };
  return { title: critic.name, description: critic.bio ?? undefined };
}

export default async function CriticPage({ params }: { params: Params }) {
  const { slug } = await params;
  const critic = await getCriticBySlug(slug);
  if (!critic) notFound();

  const [catalog, categories, following] = await Promise.all([
    getCriticCatalog(critic.id),
    getCategories(),
    getFollowedCriticIds(),
  ]);

  const category = categories.find((c) => c.id === critic.category_id);
  const categorySlug = category?.slug ?? "food";
  const scored = catalog.filter((c) => c.score != null);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <header className="mb-10 flex flex-col gap-5 sm:flex-row sm:items-start">
        {critic.avatar_url ? (
          <Image
            src={critic.avatar_url}
            alt={critic.name}
            width={96}
            height={96}
            className="rounded-full object-cover"
          />
        ) : (
          <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-full bg-flame/10 font-display text-3xl font-semibold text-flame">
            {critic.name.slice(0, 1)}
          </div>
        )}

        <div className="flex-1">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-flame">
            {category?.name ?? "Critic"}
          </p>
          <h1 className="mt-1 font-display text-4xl font-semibold text-ink sm:text-5xl">
            {critic.name}
          </h1>
          {critic.bio && <p className="mt-3 max-w-2xl text-ink-soft">{critic.bio}</p>}
          <p className="mt-2 text-sm text-ink-soft">
            {catalog.length} {catalog.length === 1 ? "pick" : "picks"}
            {critic.score_style === "stance"
              ? " · gives verdicts, not scores"
              : scored.length > 0 && ` · ${scored.length} scored`}
            {critic.platform && ` · ${critic.platform}`}
          </p>
          {critic.source_url && (
            <a
              href={critic.source_url}
              target="_blank"
              rel="noreferrer"
              className="mt-1 inline-block text-sm font-medium text-flame hover:underline"
            >
              Go to the source ↗
            </a>
          )}
        </div>

        <FollowButton criticId={critic.id} following={following.has(critic.id)} />
      </header>

      {categorySlug === "stocks" && (
        <p className="mb-8 rounded-card border border-line bg-paper px-4 py-3 text-sm text-ink-soft">
          <span className="font-semibold text-ink">Not investment advice.</span> Positions this
          person or their fund has publicly disclosed in SEC filings.
        </p>
      )}

      <section>
        <h2 className="mb-5 font-display text-2xl font-semibold text-ink">
          {critic.name.split(" ")[0]}&apos;s picks
        </h2>

        {catalog.length === 0 ? (
          <p className="text-ink-soft">Nothing seeded for this critic yet.</p>
        ) : critic.score_style === "stance" ? (
          // Verdict-only critics get a compact ranked list, not score badges.
          <ol className="divide-y divide-line overflow-hidden rounded-card border border-line bg-paper">
            {catalog.map((c) => (
              <li key={c.item.id}>
                <Link
                  href={`/${categorySlug}/${c.item.slug}`}
                  className="flex items-center gap-4 px-4 py-3 transition hover:bg-cream"
                >
                  <span className="min-w-0 flex-1 truncate font-display text-lg text-ink">
                    {c.item.name}
                  </span>
                  {c.item.critic_count > 1 && (
                    <span className="shrink-0 text-xs text-ink-soft">
                      {c.item.critic_count} critics
                    </span>
                  )}
                  {c.stance && <StanceChip stance={c.stance} size="sm" />}
                </Link>
              </li>
            ))}
          </ol>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {catalog.slice(0, 60).map((c, i) => (
              <ItemCard key={c.item.id} item={c.item} categorySlug={categorySlug} rank={i + 1} />
            ))}
          </div>
        )}
      </section>

      {critic.score_style !== "stance" && catalog.length > 60 && (
        <p className="mt-6 text-center text-sm text-ink-soft">
          Showing the top 60 of {catalog.length} picks.
        </p>
      )}
    </div>
  );
}
