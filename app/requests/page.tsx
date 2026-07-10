import type { Metadata } from "next";
import Link from "next/link";
import { getCategoryStats, getRequests } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";
import { UpvoteButton } from "@/components/UpvoteButton";
import type { RequestRow } from "@/lib/types";

export const metadata: Metadata = {
  title: "Requests",
  description: "Vote on what the critics should cover next.",
};

type SP = Promise<{ category?: string }>;

const STATUS_STYLES: Record<string, string> = {
  Requested: "bg-stone-100 text-stone-700",
  Planned: "bg-amber-100 text-amber-800",
  Covered: "bg-green-100 text-green-800",
};

function titleCase(s: string): string {
  return s.replace(/\b\w/g, (c) => c.toUpperCase());
}

function requestLabel(r: RequestRow): string {
  const noun = r.subject ?? r.query_text ?? "a pick";
  return `Best ${titleCase(noun)}${r.city ? ` in ${titleCase(r.city)}` : ""}`;
}

export default async function RequestsPage({ searchParams }: { searchParams: SP }) {
  const { category } = await searchParams;
  const stats = await getCategoryStats();
  const requests = await getRequests(category);

  const sb = await createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();

  let voted = new Set<string>();
  if (user) {
    const { data } = await sb.from("request_votes").select("request_id").eq("user_id", user.id);
    voted = new Set((data ?? []).map((v) => v.request_id as string));
  }

  const catName = new Map(stats.map((s) => [s.id, s.name]));

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <header className="mb-8">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-flame">The roadmap</p>
        <h1 className="mt-2 font-display text-5xl font-semibold text-ink">
          What should they cover next?
        </h1>
        <p className="mt-3 max-w-xl text-ink-soft">
          Every search for something no critic has covered lands here. Upvote the ones you want —
          the top of this list is the queue.
        </p>
        {!user && (
          <p className="mt-3 text-sm text-ink-soft">
            <Link href="/login" className="font-medium text-flame hover:underline">
              Sign in
            </Link>{" "}
            to cast your vote.
          </p>
        )}
      </header>

      <div className="mb-6 flex flex-wrap gap-2">
        <Link
          href="/requests"
          className={`rounded-full border px-4 py-1.5 text-sm font-medium transition ${
            !category
              ? "border-flame bg-flame text-white"
              : "border-line bg-paper text-ink-soft hover:text-ink"
          }`}
        >
          All
        </Link>
        {stats.map((c) => (
          <Link
            key={c.id}
            href={`/requests?category=${c.slug}`}
            className={`rounded-full border px-4 py-1.5 text-sm font-medium transition ${
              category === c.slug
                ? "border-flame bg-flame text-white"
                : "border-line bg-paper text-ink-soft hover:text-ink"
            }`}
          >
            {c.name}
          </Link>
        ))}
      </div>

      {requests.length === 0 ? (
        <div className="rounded-card border border-line bg-paper p-10 text-center">
          <p className="font-display text-2xl text-ink">No requests yet</p>
          <p className="mt-2 text-ink-soft">
            Search for something no critic has covered and it&apos;ll show up here.
          </p>
          <Link
            href="/search"
            className="mt-5 inline-block rounded-full bg-flame px-5 py-2.5 font-semibold text-white hover:bg-flame-dark"
          >
            Try a search
          </Link>
        </div>
      ) : (
        <ol className="space-y-3">
          {requests.map((r, i) => (
            <li
              key={r.id}
              className="flex items-center gap-4 rounded-card border border-line bg-paper p-4"
            >
              <span className="w-6 shrink-0 text-center font-display text-lg font-semibold text-ink-soft">
                {i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-display text-lg font-semibold text-ink">
                    {requestLabel(r)}
                  </h2>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                      STATUS_STYLES[r.status] ?? STATUS_STYLES.Requested
                    }`}
                  >
                    {r.status}
                  </span>
                  {r.category_id && catName.has(r.category_id) && (
                    <span className="rounded-full bg-ink/5 px-2.5 py-0.5 text-xs font-medium text-ink-soft">
                      {catName.get(r.category_id)}
                    </span>
                  )}
                </div>
                <p className="mt-0.5 text-xs text-ink-soft">searched {r.search_count}×</p>
              </div>
              <UpvoteButton
                requestId={r.id}
                upvotes={r.upvotes}
                voted={voted.has(r.id)}
                size="sm"
              />
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
