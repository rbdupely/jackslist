import Image from "next/image";
import type { Mention } from "@/lib/types";
import { youtubeThumb, youtubeUrlWithTime } from "@/lib/util";

const SENTIMENT_STYLES: Record<string, string> = {
  Positive: "bg-green-100 text-green-800",
  Mixed: "bg-amber-100 text-amber-800",
  Negative: "bg-red-100 text-red-800",
};

export function MentionCard({ mention }: { mention: Mention }) {
  const watchUrl = youtubeUrlWithTime(mention.source_url, mention.timestamp_sec);
  const thumb = youtubeThumb(mention.source_url);
  const isShort = /short/i.test(mention.source_platform ?? "");

  const dishes = mention.must_order || mention.dishes_called_out;

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
            alt={mention.source_title ?? "Jack's video"}
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
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-ink px-2.5 py-0.5 text-xs font-semibold text-cream">
            {isShort ? "YouTube Short" : "YouTube"}
          </span>
          {mention.sentiment && (
            <span
              className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                SENTIMENT_STYLES[mention.sentiment] ?? "bg-stone-100 text-stone-700"
              }`}
            >
              {mention.sentiment}
            </span>
          )}
          {mention.best_of_language && (
            <span className="rounded-full bg-flame/10 px-2.5 py-0.5 text-xs font-semibold text-flame">
              Best-of pick
            </span>
          )}
          {mention.score != null && (
            <span className="ml-auto font-display text-sm font-semibold text-ink-soft">
              {mention.score}/10
            </span>
          )}
        </div>

        {mention.verdict && (
          <blockquote className="font-display text-lg leading-snug text-ink">
            “{mention.verdict}”
          </blockquote>
        )}

        {dishes && (
          <p className="mt-3 text-sm">
            <span className="font-semibold text-ink">Order:</span>{" "}
            <span className="text-ink-soft">{dishes}</span>
          </p>
        )}

        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-soft">
          {mention.source_title && <span className="truncate">{mention.source_title}</span>}
          {watchUrl && (
            <a
              href={watchUrl}
              target="_blank"
              rel="noreferrer"
              className="font-medium text-flame hover:underline"
            >
              Watch{mention.timestamp_label ? ` at ${mention.timestamp_label}` : ""} ↗
            </a>
          )}
        </div>
      </div>
    </article>
  );
}
