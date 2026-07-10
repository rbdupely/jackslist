import Link from "next/link";
import Image from "next/image";
import {
  getAllCritics,
  getCategoryStats,
  getFollowedCriticIds,
  getMostAgreedItems,
  getOverview,
  getRecentTakes,
} from "@/lib/data";
import { SearchBar } from "@/components/SearchBar";
import { CriticCard } from "@/components/CriticCard";
import { AgreementCard } from "@/components/AgreementCard";

const EXAMPLES = ["Best pizza in New York", "Alphabet", "Tokyo", "Apple", "Steakhouse in Las Vegas"];

const TILE_COPY: Record<string, string> = {
  food: "Not the Yelp average — the palate you trust.",
  stocks: "Not an index fund — what they actually disclosed.",
  books: "Not the Goodreads average — the shelf you trust.",
  gaming: "Not IGN — the reviewer.",
  movies: "Not Rotten Tomatoes — the critic.",
};

function stanceVerb(t: { stance: string | null; score: number | null; categorySlug: string }): string {
  if (t.score != null) return `scored`;
  switch (t.stance) {
    case "selected": return "picked";
    case "new_buy": return "opened a position in";
    case "added": return "added to";
    case "trimmed": return "trimmed";
    case "exited": return "exited";
    case "holds": return "holds";
    default: return "reviewed";
  }
}

export default async function Home() {
  const [stats, critics, following, overview, agreed, recent] = await Promise.all([
    getCategoryStats(),
    getAllCritics(),
    getFollowedCriticIds(),
    getOverview(),
    getMostAgreedItems(8),
    getRecentTakes(9),
  ]);

  const catBySlug = new Map(stats.map((s) => [s.id, s.slug]));
  const followed = critics.filter((c) => following.has(c.id));

  return (
    <div>
      {/* Hero */}
      <section className="mx-auto max-w-4xl px-4 pb-8 pt-16 text-center sm:px-6 sm:pt-24">
        <p className="mb-4 text-sm font-semibold uppercase tracking-[0.2em] text-flame">
          Follow the person, not the average
        </p>
        <h1 className="font-display text-5xl font-semibold leading-[1.05] tracking-tight text-ink sm:text-6xl">
          Taste has a name.
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-lg text-ink-soft">
          Aggregate scores are noise. OnlyCritics tracks what specific, named people actually said —
          with the receipt.
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
        <p className="mt-8 text-sm text-ink-soft">
          <span className="font-semibold text-ink">{overview.critics}</span> critics ·{" "}
          <span className="font-semibold text-ink">{overview.takes.toLocaleString()}</span> takes ·{" "}
          <span className="font-semibold text-ink">{overview.items.toLocaleString()}</span> things rated
        </p>
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
                    {c.itemCount.toLocaleString()}{" "}
                    {c.itemCount === 1 ? c.item_noun : `${c.item_noun}s`}
                  </>
                ) : (
                  <span className="text-ink-soft/70">Coming soon</span>
                )}
              </p>
            </Link>
          ))}
        </div>
      </section>

      {/* Where the critics overlap */}
      {agreed.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
          <div className="mb-6">
            <h2 className="font-display text-3xl font-semibold text-ink">Where critics overlap</h2>
            <p className="mt-1 text-sm text-ink-soft">
              The same pick, reached independently — a pizza two critics both rated, a stock several
              investors all disclosed.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {agreed.map((i) => (
              <AgreementCard key={i.id} item={i} />
            ))}
          </div>
        </section>
      )}

      {/* Fresh takes */}
      {recent.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
          <h2 className="mb-6 font-display text-3xl font-semibold text-ink">Just in</h2>
          <ul className="divide-y divide-line overflow-hidden rounded-card border border-line bg-paper">
            {recent.map((t) => (
              <li key={t.id}>
                <Link
                  href={`/${t.categorySlug}/${t.item.slug}`}
                  className="flex items-center gap-3 px-4 py-3 transition hover:bg-cream"
                >
                  {t.critic.avatar_url ? (
                    <Image
                      src={t.critic.avatar_url}
                      alt={t.critic.name}
                      width={32}
                      height={32}
                      className="rounded-full object-cover"
                    />
                  ) : (
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-flame/10 text-sm font-semibold text-flame">
                      {t.critic.name.slice(0, 1)}
                    </div>
                  )}
                  <p className="min-w-0 flex-1 truncate text-sm text-ink">
                    <span className="font-semibold">{t.critic.name}</span>{" "}
                    <span className="text-ink-soft">{stanceVerb(t)}</span>{" "}
                    <span className="font-medium">{t.item.name}</span>
                  </p>
                  {t.score_original && (
                    <span className="shrink-0 font-display text-sm font-semibold text-flame">
                      {t.score_original}
                    </span>
                  )}
                  {t.published_on && (
                    <span className="hidden shrink-0 text-xs text-ink-soft sm:inline">
                      {t.published_on}
                    </span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

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
    </div>
  );
}
