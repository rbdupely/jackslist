import Link from "next/link";
import type { CuratedList } from "@/lib/curate";
import { formatScore } from "@/lib/util";

export function CuratedListCard({ list }: { list: CuratedList }) {
  const top = list.venues.slice(0, 3);
  return (
    <Link
      href={list.href}
      className="group flex flex-col justify-between rounded-card border border-line bg-paper p-5 transition hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/5"
    >
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-flame">
          Jack&apos;s list
        </p>
        <h3 className="mt-2 font-display text-2xl font-semibold leading-tight text-ink">
          {list.title}
        </h3>
        <ol className="mt-4 space-y-2">
          {top.map((v, i) => (
            <li key={v.id} className="flex items-baseline gap-2 text-sm">
              <span className="font-display font-semibold text-ink-soft">{i + 1}.</span>
              <span className="truncate text-ink">{v.name}</span>
              <span className="ml-auto shrink-0 font-display font-semibold text-flame">
                {formatScore(v.jack_score)}
              </span>
            </li>
          ))}
        </ol>
      </div>
      <p className="mt-5 flex items-center gap-1 text-sm font-medium text-ink-soft">
        {list.count} {list.count === 1 ? "spot" : "spots"}
        <span className="ml-auto inline-flex items-center gap-1 text-ink transition group-hover:text-flame">
          See the list
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path
              d="M5 12h14M13 6l6 6-6 6"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
      </p>
    </Link>
  );
}
