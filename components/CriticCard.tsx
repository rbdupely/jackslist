import Link from "next/link";
import type { Critic } from "@/lib/types";
import { FollowButton } from "@/components/FollowButton";
import { CriticAvatar } from "@/components/CriticAvatar";
import { catUI } from "@/lib/ui";

export function CriticCard({
  critic,
  categorySlug,
  itemCount,
  following,
}: {
  critic: Critic;
  categorySlug: string;
  itemCount?: number;
  following: boolean;
}) {
  const ui = catUI(categorySlug);
  return (
    <div className="group flex items-center gap-3.5 rounded-card border border-line bg-surface p-3.5 shadow-e1 transition hover:border-line-strong hover:shadow-e2">
      <Link href={`/critic/${critic.slug}`} className="relative shrink-0">
        <CriticAvatar
          name={critic.name}
          avatarUrl={critic.avatar_url}
          categorySlug={categorySlug}
          size={52}
        />
        <span
          className={`absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-surface ${ui.dot}`}
        />
      </Link>

      <div className="min-w-0 flex-1">
        <Link
          href={`/critic/${critic.slug}`}
          className="font-display text-base font-bold leading-tight text-ink hover:text-flame"
        >
          {critic.name}
        </Link>
        <p className="mt-0.5 flex items-center gap-1.5 text-[13px] text-muted">
          <span className={`font-semibold ${ui.text}`}>{ui.label}</span>
          <span className="text-faint">·</span>
          <span className="truncate">
            {critic.platform}
            {itemCount != null && ` · ${itemCount.toLocaleString()} rated`}
          </span>
        </p>
      </div>

      <FollowButton criticId={critic.id} following={following} size="sm" />
    </div>
  );
}
