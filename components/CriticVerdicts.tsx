import Link from "next/link";
import type { ScoredItem, TakeWithCritic } from "@/lib/types";
import { ScoreBadge } from "@/components/ScoreBadge";
import { StanceChip } from "@/components/StanceChip";
import { formatScore } from "@/lib/util";

// The brand rule, in one component:
//   - a circular badge is always ONE person's score, labelled with their name
//   - critics who don't score get a stance chip instead
//   - "Critics' consensus" is a visually distinct pill, only when >= 2 scored
//   - the crowd baseline is muted reference text, never styled like a take
export function CriticVerdicts({
  item,
  takes,
}: {
  item: ScoredItem;
  takes: TakeWithCritic[];
}) {
  // Representative take per critic: highest score, else most recent.
  const byCritic = new Map<string, TakeWithCritic>();
  for (const t of takes) {
    if (!t.critic) continue;
    const cur = byCritic.get(t.critic.id);
    if (!cur) {
      byCritic.set(t.critic.id, t);
      continue;
    }
    const better =
      (t.score ?? -1) > (cur.score ?? -1) ||
      ((t.score ?? -1) === (cur.score ?? -1) &&
        (t.published_on ?? "") > (cur.published_on ?? ""));
    if (better) byCritic.set(t.critic.id, t);
  }
  const reps = [...byCritic.values()];

  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-4">
      {reps.map((t) => (
        <Link
          key={t.critic.id}
          href={`/critic/${t.critic.slug}`}
          className="group flex items-center gap-3"
        >
          {t.score != null ? (
            <ScoreBadge score={t.score} size="md" />
          ) : t.stance ? (
            <StanceChip stance={t.stance} />
          ) : null}
          <div className="leading-tight">
            <p className="text-sm font-semibold text-ink group-hover:text-flame">
              {t.critic.name}
            </p>
            {t.score_original && (
              <p className="text-xs text-ink-soft">{t.score_original}</p>
            )}
          </div>
        </Link>
      ))}

      {item.consensus_score != null && (
        <span className="inline-flex items-center gap-2.5 rounded-full bg-ink px-4 py-2 text-white">
          <span className="overline text-white/70">Consensus</span>
          <span className="tnum text-lg font-bold">{formatScore(item.consensus_score)}</span>
          <span className="text-xs text-white/60">· {item.scored_critic_count} critics</span>
        </span>
      )}

      {item.crowd_score != null && (
        <span className="text-xs text-faint">
          The crowd:{" "}
          {item.crowd_url ? (
            <a href={item.crowd_url} target="_blank" rel="noreferrer" className="tnum underline">
              {item.crowd_source} {formatScore(item.crowd_score)}
              {item.crowd_scale === "0-5" ? "★" : ""}
            </a>
          ) : (
            <span className="tnum">
              {item.crowd_source} {formatScore(item.crowd_score)}
            </span>
          )}
        </span>
      )}
    </div>
  );
}
