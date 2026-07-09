import Link from "next/link";
import type { Venue } from "@/lib/types";
import { ScoreBadge } from "@/components/ScoreBadge";
import { VenuePhoto } from "@/components/VenuePhoto";

export function VenueCard({ venue, rank }: { venue: Venue; rank?: number }) {
  const meta = [venue.category, venue.cuisine_type].filter(Boolean).join(" · ");
  return (
    <Link
      href={`/venue/${venue.slug}`}
      className="group flex flex-col overflow-hidden rounded-card border border-line bg-paper transition hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/5"
    >
      <div className="relative aspect-[16/10] overflow-hidden">
        <VenuePhoto venue={venue} className="transition duration-500 group-hover:scale-105" />
        <div className="absolute right-3 top-3">
          <ScoreBadge score={venue.jack_score} size="md" />
        </div>
        {rank != null && (
          <div className="absolute left-3 top-3 rounded-full bg-ink/85 px-2.5 py-1 font-display text-sm font-semibold text-cream">
            #{rank}
          </div>
        )}
        {venue.mention_count > 1 && (
          <div className="absolute bottom-3 left-3 rounded-full bg-flame px-2.5 py-1 text-xs font-semibold text-white">
            Featured {venue.mention_count}×
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-1.5 p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-display text-lg font-semibold leading-snug text-ink">
            {venue.name}
          </h3>
          {venue.price_tier && (
            <span className="shrink-0 pt-1 text-sm font-medium text-ink-soft">
              {venue.price_tier}
            </span>
          )}
        </div>
        {meta && <p className="text-sm text-ink-soft">{meta}</p>}
        {venue.jack_blurb && (
          <p className="mt-1 line-clamp-3 text-sm leading-relaxed text-ink/80">
            {venue.jack_blurb}
          </p>
        )}
        {venue.city && (
          <p className="mt-auto pt-2 text-xs font-medium uppercase tracking-wide text-ink-soft">
            {venue.neighborhood ? `${venue.neighborhood}, ` : ""}
            {venue.city}
          </p>
        )}
      </div>
    </Link>
  );
}
