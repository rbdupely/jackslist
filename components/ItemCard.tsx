import Link from "next/link";
import type { ScoredItem } from "@/lib/types";
import { itemCuisine } from "@/lib/types";
import { ScoreBadge } from "@/components/ScoreBadge";
import { ItemPhoto } from "@/components/ItemPhoto";

export function ItemCard({
  item,
  categorySlug,
  rank,
}: {
  item: ScoredItem;
  categorySlug: string;
  rank?: number;
}) {
  const meta = [item.subtype, itemCuisine(item) ?? item.creator].filter(Boolean).join(" · ");
  return (
    <Link
      href={`/${categorySlug}/${item.slug}`}
      className="group flex flex-col overflow-hidden rounded-card border border-line bg-paper transition hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/5"
    >
      <div className="relative aspect-[16/10] overflow-hidden">
        <ItemPhoto item={item} className="transition duration-500 group-hover:scale-105" />
        <div className="absolute right-3 top-3">
          <ScoreBadge score={item.top_score} size="md" />
        </div>
        {rank != null && (
          <div className="absolute left-3 top-3 rounded-full bg-ink/85 px-2.5 py-1 font-display text-sm font-semibold text-cream">
            #{rank}
          </div>
        )}
        {item.take_count > 1 && (
          <div className="absolute bottom-3 left-3 rounded-full bg-flame px-2.5 py-1 text-xs font-semibold text-white">
            Featured {item.take_count}×
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-1.5 p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-display text-lg font-semibold leading-snug text-ink">
            {item.name}
          </h3>
          {item.price_tier && (
            <span className="shrink-0 pt-1 text-sm font-medium text-ink-soft">
              {item.price_tier}
            </span>
          )}
        </div>
        {meta && <p className="text-sm text-ink-soft">{meta}</p>}
        {item.metadata?.blurb && (
          <p className="mt-1 line-clamp-3 text-sm leading-relaxed text-ink/80">
            {item.metadata.blurb}
          </p>
        )}
        {item.city && (
          <p className="mt-auto pt-2 text-xs font-medium uppercase tracking-wide text-ink-soft">
            {item.neighborhood ? `${item.neighborhood}, ` : ""}
            {item.city}
          </p>
        )}
      </div>
    </Link>
  );
}
