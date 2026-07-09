import { formatScore, scoreBadgeClasses } from "@/lib/util";

const SIZES = {
  sm: "h-9 w-9 text-sm",
  md: "h-12 w-12 text-lg",
  lg: "h-16 w-16 text-2xl",
  xl: "h-20 w-20 text-3xl",
} as const;

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
      className={`inline-flex flex-col items-center justify-center rounded-full font-display font-semibold leading-none shadow-sm ring-1 ring-black/5 ${SIZES[size]} ${scoreBadgeClasses(
        score,
      )} ${className}`}
      title={`Jack score: ${formatScore(score)} / 10`}
      aria-label={`Jack score ${formatScore(score)} out of 10`}
    >
      <span>{formatScore(score)}</span>
    </div>
  );
}
