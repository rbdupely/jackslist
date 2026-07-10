// Small shared helpers (formatting, slugs, score styling).

export function slugify(input: string): string {
  return input
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "") // strip accents
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

// City <-> URL slug. We slugify the city name for the route and match back by
// comparing slugs (the set of cities is small), so "The Hamptons" round-trips.
export function citySlug(city: string): string {
  return slugify(city);
}

export type ScoreTier = "elite" | "great" | "good" | "mixed";

export function scoreTier(score: number | null | undefined): ScoreTier {
  const s = score ?? 0;
  if (s >= 9) return "elite";
  if (s >= 8) return "great";
  if (s >= 6.5) return "good";
  return "mixed";
}

// Tailwind classes for the circular score badge, by tier.
// Brand red for the elite, authoritative black for the great, outlined for the
// rest — instantly scannable, lets photos and category color carry the vibrancy.
export function scoreBadgeClasses(score: number | null | undefined): string {
  switch (scoreTier(score)) {
    case "elite":
      return "bg-flame text-white ring-1 ring-flame-dark/20";
    case "great":
      return "bg-ink text-white";
    case "good":
      return "bg-surface text-ink ring-1 ring-line-strong";
    default:
      return "bg-sunk text-muted";
  }
}

export function formatScore(score: number | null | undefined): string {
  if (score == null) return "—";
  // Show one decimal only when it isn't a whole number (9 not 9.0, 8.5 stays).
  return Number.isInteger(score) ? String(score) : score.toFixed(1);
}

export function priceLabel(tier: string | null | undefined): string {
  return tier && tier.trim() ? tier.trim() : "";
}

// Parse a video timestamp string ("1:23", "12:05", "1:02:03", or "83") into
// seconds, for building a YouTube deep link (&t=NNNs).
export function parseTimestampToSeconds(raw: string | null | undefined): number | null {
  if (!raw) return null;
  const s = raw.trim();
  if (!s) return null;
  if (/^\d+$/.test(s)) return parseInt(s, 10);
  const parts = s.split(":").map((p) => parseInt(p, 10));
  if (parts.some((n) => Number.isNaN(n))) return null;
  let secs = 0;
  for (const p of parts) secs = secs * 60 + p;
  return secs;
}

// Build a YouTube watch URL that jumps to the given timestamp.
export function youtubeUrlWithTime(url: string | null | undefined, seconds: number | null): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    if (seconds && seconds > 0) u.searchParams.set("t", `${seconds}s`);
    return u.toString();
  } catch {
    return url;
  }
}

// Extract a YouTube video id from a watch/shorts/youtu.be URL.
export function youtubeVideoId(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtu.be")) return u.pathname.slice(1) || null;
    if (u.pathname.startsWith("/shorts/")) return u.pathname.split("/")[2] ?? null;
    return u.searchParams.get("v");
  } catch {
    return null;
  }
}

export function youtubeThumb(url: string | null | undefined): string | null {
  const id = youtubeVideoId(url);
  return id ? `https://i.ytimg.com/vi/${id}/hqdefault.jpg` : null;
}
