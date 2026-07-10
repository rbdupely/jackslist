import Link from "next/link";
import Image from "next/image";
import type { Critic } from "@/lib/types";
import { FollowButton } from "@/components/FollowButton";

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
  return (
    <div className="flex items-center gap-4 rounded-card border border-line bg-paper p-4">
      <Link href={`/critic/${critic.slug}`} className="shrink-0">
        {critic.avatar_url ? (
          <Image
            src={critic.avatar_url}
            alt={critic.name}
            width={52}
            height={52}
            className="rounded-full object-cover"
          />
        ) : (
          <div className="flex h-[52px] w-[52px] items-center justify-center rounded-full bg-flame/10 font-display text-lg font-semibold text-flame">
            {critic.name.slice(0, 1)}
          </div>
        )}
      </Link>
      <div className="min-w-0 flex-1">
        <Link
          href={`/critic/${critic.slug}`}
          className="font-display text-lg font-semibold text-ink hover:text-flame"
        >
          {critic.name}
        </Link>
        <p className="truncate text-sm text-ink-soft">
          {critic.platform}
          {itemCount != null && ` · ${itemCount} covered`}
          {critic.score_style === "stance" && " · no scores"}
        </p>
        <p className="mt-0.5 text-xs uppercase tracking-wide text-ink-soft">{categorySlug}</p>
      </div>
      <FollowButton criticId={critic.id} following={following} size="sm" />
    </div>
  );
}
