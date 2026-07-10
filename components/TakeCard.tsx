import Image from "next/image";
import Link from "next/link";
import type { TakeWithCritic } from "@/lib/types";
import { youtubeThumb, youtubeUrlWithTime } from "@/lib/util";

const STANCE_STYLES: Record<string, string> = {
  rave: "bg-stocks/12 text-stocks",
  positive: "bg-stocks/12 text-stocks",
  mixed: "bg-gold/15 text-[#8a6516]",
  negative: "bg-flame/12 text-flame-dark",
  new_buy: "bg-stocks/12 text-stocks",
  added: "bg-stocks/12 text-stocks",
  holds: "bg-sunk text-muted",
  trimmed: "bg-gold/15 text-[#8a6516]",
  exited: "bg-flame/12 text-flame-dark",
  called_out: "bg-sunk text-muted",
};

function stanceLabel(s: string): string {
  return s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function TakeCard({ take }: { take: TakeWithCritic }) {
  const thumb = youtubeThumb(take.source_url);
  const isYouTube = !!thumb;
  const watchUrl = isYouTube
    ? youtubeUrlWithTime(take.source_url, take.timestamp_sec)
    : take.source_url;
  const isShort = /short/i.test(take.source_platform ?? "");
  const timestampLabel = take.metadata?.timestamp_label;
  const critic = take.critic;

  const platformLabel = isYouTube
    ? isShort
      ? "YouTube Short"
      : "YouTube"
    : take.source_platform;
  const linkLabel = isYouTube
    ? `Watch${timestampLabel ? ` at ${timestampLabel}` : ""}`
    : "View source";

  return (
    <article className="flex flex-col gap-4 rounded-card border border-line bg-surface p-4 shadow-e1 sm:flex-row sm:p-5">
      {thumb && watchUrl && (
        <a
          href={watchUrl}
          target="_blank"
          rel="noreferrer"
          className="group relative block aspect-video w-full shrink-0 overflow-hidden rounded-xl bg-sunk sm:w-56"
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
          {platformLabel && (
            <span className="rounded-md bg-ink px-2 py-0.5 text-[11px] font-semibold text-white">
              {platformLabel}
            </span>
          )}
          {take.stance && (
            <span
              className={`rounded-md px-2 py-0.5 text-[11px] font-semibold ${
                STANCE_STYLES[take.stance] ?? "bg-sunk text-muted"
              }`}
            >
              {stanceLabel(take.stance)}
            </span>
          )}
          {take.best_of_language && (
            <span className="rounded-md bg-flame/12 px-2 py-0.5 text-[11px] font-semibold text-flame">
              Best-of pick
            </span>
          )}
          {take.score_original && (
            <span className="tnum ml-auto text-sm font-bold text-ink">
              {take.score_original}
            </span>
          )}
        </div>

        {/* Only a spoken/written verdict is quoted. A filing-derived disclosure
            is a statement of fact and must not be dressed up as a quotation. */}
        {take.verdict &&
          (isYouTube ? (
            <blockquote className="font-display text-lg leading-snug text-ink">
              “{take.verdict}”
            </blockquote>
          ) : (
            <p className="font-display text-lg leading-snug text-ink">{take.verdict}</p>
          ))}

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
              {linkLabel} ↗
            </a>
          )}
        </div>
      </div>
    </article>
  );
}
