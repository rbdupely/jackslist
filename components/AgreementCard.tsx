import Link from "next/link";
import type { ItemWithCategory } from "@/lib/data";
import { ScoreBadge } from "@/components/ScoreBadge";
import { CategoryIcon } from "@/components/CategoryIcon";
import { formatScore } from "@/lib/util";
import { catUI } from "@/lib/ui";

// An item several critics independently covered. Scored categories show the
// consensus number; stance categories show the count of critics.
export function AgreementCard({ item }: { item: ItemWithCategory }) {
  const ui = catUI(item.categorySlug);
  const isStocks = item.categorySlug === "stocks";
  const coverLabel = isStocks
    ? `${item.critic_count} investors hold it`
    : `${item.critic_count} critics covered it`;

  return (
    <Link
      href={`/${item.categorySlug}/${item.slug}`}
      className="group flex items-center gap-4 rounded-card border border-line bg-surface p-4 shadow-e1 transition hover:-translate-y-0.5 hover:border-line-strong hover:shadow-e2"
    >
      <div className="relative shrink-0">
        {item.consensus_score != null ? (
          <div className="flex flex-col items-center gap-1">
            <ScoreBadge score={item.consensus_score} size="lg" />
            <span className="overline text-faint">consensus</span>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-1">
            <div
              className={`tnum grid h-14 w-14 place-items-center rounded-full text-xl font-bold text-white ${ui.bg}`}
            >
              {item.critic_count}
            </div>
            <span className="overline text-faint">{isStocks ? "holders" : "critics"}</span>
          </div>
        )}
        {/* Colored category marker — identify the item type at a glance. */}
        <span
          className={`absolute -right-1.5 -top-1.5 grid h-6 w-6 place-items-center rounded-full ring-2 ring-surface ${ui.tint}`}
        >
          <CategoryIcon slug={item.categorySlug} size={13} />
        </span>
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate font-display text-lg font-bold text-ink group-hover:text-flame">
          {item.name}
        </p>
        <p className="truncate text-sm text-muted">{coverLabel}</p>
        <p className="mt-1 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-faint">
          <CategoryIcon slug={item.categorySlug} size={13} className="shrink-0" />
          {item.categoryName}
          {item.city ? ` · ${item.city}` : ""}
          {item.crowd_score != null && (
            <span className="tnum normal-case tracking-normal">
              · crowd {formatScore(item.crowd_score)}
            </span>
          )}
        </p>
      </div>

      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        className="shrink-0 text-faint transition group-hover:translate-x-0.5 group-hover:text-ink"
        aria-hidden
      >
        <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </Link>
  );
}
