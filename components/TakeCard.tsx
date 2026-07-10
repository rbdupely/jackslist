import Image from "next/image";
import Link from "next/link";
import type { TakeWithCritic } from "@/lib/types";
import { youtubeThumb, youtubeUrlWithTime } from "@/lib/util";

const STANCE_STYLES: Record<string, string> = {
  rave: "bg-green-100 text-green-800",
  positive: "bg-green-100 text-green-800",
  mixed: "bg-amber-100 text-amber-800",
  negative: "bg-red-100 text-red-800",
  new_buy: "bg-green-100 text-green-800",
  added: "bg-green-100 text-green-800",
  holds: "bg-stone-100 text-stone-700",
  trimmed: "bg-amber-100 text-amber-800",
  exited: "bg-red-100 text-red-800",
  called_out: "bg-stone-100 text-stone-700",
};

function stanceLabel(s: string): string {
  return s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function TakeCard({ take }: { take: TakeWithCritic }) {
  const watchUrl = youtubeUrlWithTime(take.source_url, take.timestamp_sec);
  const thumb = youtubeThumb(take.source_url);
  const isShort = /short/i.test(take.source_platform ?? "");
  const timestampLabel = take.metadata?.timestamp_label;
  const critic = take.critic;

  return (
    <article className="flex flex-col gap-4 rounded-card border border-line bg-paper p-5 sm:flex-row">
      {thumb && watchUrl && (
        <a
          href={watchUrl}
          target="_blank"
          rel="noreferrer"
          className="group relative block aspect-video w-full shrink-0 overflow-hidden rounded-xl bg-stone-100 sm:w-56"
        >
          <Image
            src={thumb}
            alt={take.source_title ?? `${critic?.name}'s review`}
            fill
            sizes="(max-width: 640px) 100vw, 224px"
            className="object-cover transition group-hover:scale-105"
          />
          <span className="absolute inset-0 flex items-center justify-center">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-black/60 text-white transition group-hover:bg-flame">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                <path d="M8 5v14l11-7z" />
              </svg>
            </span>
          </span>
        </a>
      )}

      <div className="min-w-0 flex-1">
        {/* Whose take this is — always attributed. */}
        {critic && (
          <Link
            href={`/critic/${critic.slug}`}
            className="mb-2 inline-flex items-center gap-2 text-sm font-semibold text-ink hover:text-flame"
          >
            {critic.avatar_url && (
              <Image
                src={critic.avatar_url}
                alt={critic.name}
                width={24}
                height={24}
                className="rounded-full object-cover"
              />
            )}
            {critic.name}
          </Link>
        )}

        <div className="mb-2 flex flex-wrap items-center gap-2">
          {take.source_platform && (
            <span className="rounded-full bg-ink px-2.5 py-0.5 text-xs font-semibold text-cream">
              {isShort ? "YouTube Short" : "YouTube"}
            </span>
          )}
          {take.stance && (
            <span
              className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                STANCE_STYLES[take.stance] ?? "bg-stone-100 text-stone-700"
              }`}
            >
              {stanceLabel(take.stance)}
            </span>
          )}
          {take.best_of_language && (
            <span className="rounded-full bg-flame/10 px-2.5 py-0.5 text-xs font-semibold text-flame">
              Best-of pick
            </span>
          )}
          {take.score_original && (
            <span className="ml-auto font-display text-sm font-semibold text-ink-soft">
              {take.score_original}
            </span>
          )}
        </div>

        {take.verdict && (
          <blockquote className="font-display text-lg leading-snug text-ink">
            “{take.verdict}”
          </blockquote>
        )}

        {take.highlights && (
          <p className="mt-3 text-sm">
            <span className="font-semibold text-ink">Order:</span>{" "}
            <span className="text-ink-soft">{take.highlights}</span>
          </p>
        )}

        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-soft">
          {take.source_title && <span className="truncate">{take.source_title}</span>}
          {watchUrl && (
            <a
              href={watchUrl}
              target="_blank"
              rel="noreferrer"
              className="font-medium text-flame hover:underline"
            >
              Watch{timestampLabel ? ` at ${timestampLabel}` : ""} ↗
            </a>
          )}
        </div>
      </div>
    </article>
  );
}
