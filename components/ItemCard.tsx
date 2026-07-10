import Link from "next/link";
import type { ScoredItem } from "@/lib/types";
import { itemCuisine } from "@/lib/types";
import { ScoreBadge } from "@/components/ScoreBadge";
import { ItemPhoto } from "@/components/ItemPhoto";
import { catUI } from "@/lib/ui";

export function ItemCard({
  item,
  categorySlug,
  rank,
}: {
  item: ScoredItem;
  categorySlug: string;
  rank?: number;
}) {
  const ui = catUI(categorySlug);
  const meta = [item.subtype, itemCuisine(item) ?? item.creator].filter(Boolean).join(" · ");
  const hasScore = item.top_score != null;

  return (
    <Link
      href={`/${categorySlug}/${item.slug}`}
      className="group flex flex-col overflow-hidden rounded-card border border-line bg-surface shadow-e1 transition hover:-translate-y-1 hover:border-line-strong hover:shadow-e3"
    >
      <div className="relative aspect-[3/2] overflow-hidden bg-sunk">
        <ItemPhoto item={item} className="transition duration-500 group-hover:scale-[1.04]" />

        {rank != null && (
          <div className="tnum absolute left-2.5 top-2.5 grid h-7 min-w-7 place-items-center rounded-md bg-ink/85 px-1.5 text-sm font-bold text-white backdrop-blur">
            {rank}
          </div>
        )}
        {hasScore && (
          <div className="absolute right-2.5 top-2.5 drop-shadow-sm">
            <ScoreBadge score={item.top_score} size="md" />
          </div>
        )}
        {item.critic_count > 1 && (
          <div className="absolute bottom-2.5 left-2.5 rounded-md bg-surface/95 px-2 py-1 text-[11px] font-semibold text-ink shadow-e1">
            {item.consensus_score != null
              ? `${item.critic_count} critics agree`
              : `${item.critic_count} critics`}
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-1 p-3.5">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-display text-[17px] font-bold leading-tight text-ink group-hover:text-flame">
            {item.name}
          </h3>
          {item.price_tier && (
            <span className="tnum shrink-0 pt-0.5 text-xs font-semibold text-muted">
              {item.price_tier}
            </span>
          )}
        </div>

        {meta && <p className="truncate text-[13px] text-muted">{meta}</p>}

        {item.metadata?.blurb && (
          <p className="mt-0.5 line-clamp-2 text-[13px] leading-relaxed text-ink/75">
            {item.metadata.blurb}
          </p>
        )}

        <div className="mt-auto flex items-center gap-1.5 pt-2">
          <span className={`h-1.5 w-1.5 rounded-full ${ui.dot}`} />
          <span className="truncate text-[11px] font-medium uppercase tracking-wide text-faint">
            {item.city
              ? `${item.neighborhood ? `${item.neighborhood}, ` : ""}${item.city}`
              : ui.label}
          </span>
        </div>
      </div>
    </Link>
  );
}
