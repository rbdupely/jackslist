import { formatScore, scoreBadgeClasses } from "@/lib/util";

const SIZES = {
  sm: "h-8 w-8 text-[13px]",
  md: "h-11 w-11 text-base",
  lg: "h-14 w-14 text-xl",
  xl: "h-[4.5rem] w-[4.5rem] text-3xl",
} as const;

// The circular badge is always ONE critic's score. Numerals are tabular-mono so
// they read as data. Never used for an average.
export function ScoreBadge({
  score,
  size = "md",
  className = "",
}: {
  score: number | null | undefined;
  size?: keyof typeof SIZES;
  className?: string;
}) {
  return (
    <div
      className={`tnum inline-flex items-center justify-center rounded-full font-semibold leading-none ${SIZES[size]} ${scoreBadgeClasses(
        score,
      )} ${className}`}
      title={`Critic score: ${formatScore(score)} / 10`}
      aria-label={`Score ${formatScore(score)} out of 10`}
    >
      {formatScore(score)}
    </div>
  );
}
