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
import { catUI } from "@/lib/ui";

const EXAMPLES = ["Best pizza in New York", "Alphabet", "Tokyo", "Apple", "Steakhouse in Las Vegas"];

const TILE_COPY: Record<string, string> = {
  food: "Not the Yelp average — the palate you trust.",
  stocks: "Not an index fund — what they actually bought.",
  books: "Not the Goodreads average — the shelf you trust.",
  gaming: "Not IGN — the reviewer.",
  movies: "Not Rotten Tomatoes — the critic.",
};

function stanceVerb(t: { stance: string | null; score: number | null }): string {
  if (t.score != null) return "scored";
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
      <section className="border-b border-line bg-surface">
        <div className="mx-auto max-w-4xl px-4 py-16 text-center sm:px-6 sm:py-20">
          <p className="overline mb-4 text-flame">Follow the critic, not the crowd</p>
          <h1 className="font-display text-5xl font-extrabold tracking-tight text-ink sm:text-[4.25rem]">
            Taste has a name.
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-lg text-muted">
            The aggregator for people with taste. Real scores from named critics — food, stocks,
            books and more — every one linked to its source.
          </p>
          <div className="mx-auto mt-8 max-w-2xl">
            <SearchBar variant="hero" placeholder="Search a spot, a stock, a book, a critic…" />
          </div>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
            {EXAMPLES.map((ex) => (
              <Link
                key={ex}
                href={`/search?q=${encodeURIComponent(ex)}`}
                className="rounded-chip border border-line bg-canvas px-3 py-1.5 text-sm text-muted transition hover:border-line-strong hover:text-ink"
              >
                {ex}
              </Link>
            ))}
          </div>
          <div className="tnum mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-1 text-sm text-muted">
            <span><span className="font-bold text-ink">{overview.critics}</span> critics</span>
            <span className="text-line-strong">·</span>
            <span><span className="font-bold text-ink">{overview.takes.toLocaleString()}</span> takes</span>
            <span className="text-line-strong">·</span>
            <span><span className="font-bold text-ink">{overview.items.toLocaleString()}</span> things rated</span>
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-5">
          {stats.map((c) => {
            const ui = catUI(c.slug);
            const live = c.criticCount > 0;
            return (
              <Link
                key={c.id}
                href={`/${c.slug}`}
                className="group relative flex flex-col overflow-hidden rounded-card border border-line bg-surface p-4 shadow-e1 transition hover:-translate-y-1 hover:shadow-e3"
              >
                <span className={`absolute inset-x-0 top-0 h-1 ${ui.bg}`} />
                <span className={`overline ${ui.text}`}>{ui.label}</span>
                <p className="mt-2 text-[13px] leading-snug text-muted">{TILE_COPY[c.slug]}</p>
                <p className="tnum mt-6 text-sm font-semibold text-ink">
                  {live ? (
                    <>
                      {c.criticCount} {c.criticCount === 1 ? "critic" : "critics"}
                      <span className="font-normal text-faint"> · {c.itemCount.toLocaleString()}</span>
                    </>
                  ) : (
                    <span className="font-normal text-faint">Coming soon</span>
                  )}
                </p>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Where critics overlap */}
      {agreed.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
          <div className="mb-5 flex items-end justify-between gap-4">
            <div>
              <h2 className="font-display text-2xl font-extrabold text-ink sm:text-3xl">
                Where critics overlap
              </h2>
              <p className="mt-1 text-sm text-muted">
                The same pick, reached independently — a pizza two critics both rated, a stock
                several investors all hold.
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            {agreed.map((i) => (
              <AgreementCard key={i.id} item={i} />
            ))}
          </div>
        </section>
      )}

      {/* Fresh takes + critics side by side on large screens */}
      <section className="mx-auto grid max-w-7xl grid-cols-1 gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[1.3fr_1fr]">
        {recent.length > 0 && (
          <div>
            <h2 className="mb-5 font-display text-2xl font-extrabold text-ink sm:text-3xl">Just in</h2>
            <ul className="divide-y divide-line overflow-hidden rounded-card border border-line bg-surface shadow-e1">
              {recent.map((t) => {
                const ui = catUI(t.categorySlug);
                return (
                  <li key={t.id}>
                    <Link
                      href={`/${t.categorySlug}/${t.item.slug}`}
                      className="flex items-center gap-3 px-4 py-3 transition hover:bg-canvas"
                    >
                      {t.critic.avatar_url ? (
                        <Image
                          src={t.critic.avatar_url}
                          alt={t.critic.name}
                          width={34}
                          height={34}
                          className="h-[34px] w-[34px] rounded-full object-cover"
                        />
                      ) : (
                        <div
                          className={`grid h-[34px] w-[34px] shrink-0 place-items-center rounded-full ${ui.tint} text-sm font-bold ${ui.text}`}
                        >
                          {t.critic.name.slice(0, 1)}
                        </div>
                      )}
                      <p className="min-w-0 flex-1 truncate text-sm text-ink">
                        <span className="font-semibold">{t.critic.name}</span>{" "}
                        <span className="text-muted">{stanceVerb(t)}</span>{" "}
                        <span className="font-medium">{t.item.name}</span>
                      </p>
                      {t.score_original && (
                        <span className="tnum shrink-0 text-sm font-bold text-flame">
                          {t.score_original}
                        </span>
                      )}
                      {t.published_on && (
                        <span className="tnum hidden shrink-0 text-xs text-faint sm:inline">
                          {t.published_on}
                        </span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        <div>
          <div className="mb-5 flex items-baseline justify-between">
            <h2 className="font-display text-2xl font-extrabold text-ink sm:text-3xl">
              {followed.length > 0 ? "Your critics" : "Who to follow"}
            </h2>
          </div>
          <div className="flex flex-col gap-3">
            {(followed.length > 0 ? followed : critics.slice(0, 6)).map((c) => (
              <CriticCard
                key={c.id}
                critic={c}
                categorySlug={catBySlug.get(c.category_id) ?? "food"}
                following={following.has(c.id)}
              />
            ))}
          </div>
        </div>
      </section>

      {/* All critics */}
      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <div className="mb-5 flex items-end justify-between">
          <h2 className="font-display text-2xl font-extrabold text-ink sm:text-3xl">The full roster</h2>
          <p className="hidden text-sm text-muted sm:block">
            Every take on this site traces back to one of them
          </p>
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
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
