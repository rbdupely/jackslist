import Link from "next/link";
import type { ItemWithCategory } from "@/lib/data";
import { ScoreBadge } from "@/components/ScoreBadge";
import { formatScore } from "@/lib/util";

// A single item several critics have independently covered. Category-agnostic:
// scored categories (food) show the consensus number; stance categories
// (stocks, books) show how many critics landed on it.
export function AgreementCard({ item }: { item: ItemWithCategory }) {
  const isStocks = item.categorySlug === "stocks";
  const coverLabel = isStocks
    ? `${item.critic_count} investors disclosed it`
    : `${item.critic_count} critics covered it`;

  return (
    <Link
      href={`/${item.categorySlug}/${item.slug}`}
      className="group flex items-center gap-4 rounded-card border border-line bg-paper p-4 transition hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/5"
    >
      {item.consensus_score != null ? (
        <div className="flex flex-col items-center">
          <ScoreBadge score={item.consensus_score} size="md" />
          <span className="mt-1 text-[10px] font-medium uppercase tracking-wide text-ink-soft">
            consensus
          </span>
        </div>
      ) : (
        <div className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-full bg-ink text-cream">
          <span className="font-display text-lg font-semibold leading-none">
            {item.critic_count}
          </span>
          <span className="text-[9px] uppercase tracking-wide">critics</span>
        </div>
      )}

      <div className="min-w-0 flex-1">
        <p className="truncate font-display text-lg font-semibold text-ink group-hover:text-flame">
          {item.name}
        </p>
        <p className="truncate text-sm text-ink-soft">{coverLabel}</p>
        <p className="text-xs uppercase tracking-wide text-ink-soft/70">
          {item.categoryName}
          {item.city ? ` · ${item.city}` : ""}
          {item.crowd_score != null ? ` · crowd ${formatScore(item.crowd_score)}` : ""}
        </p>
      </div>
    </Link>
  );
}
