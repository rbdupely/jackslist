import type { Critic } from "@/lib/types";

// OnlyCritics is about following named humans. Awards, guides, and aggregators
// are institutions — real and useful, but not people — so they live in their
// own "Awards & Guides" lane, distinguished by platform.
export const AWARD_PLATFORMS = new Set(["Guide", "Literary Prize", "Aggregator"]);

export function isAward(c: { platform?: string | null }): boolean {
  return !!c.platform && AWARD_PLATFORMS.has(c.platform);
}

export function splitCritics<T extends Pick<Critic, "platform">>(
  critics: T[],
): { people: T[]; awards: T[] } {
  const people: T[] = [];
  const awards: T[] = [];
  for (const c of critics) (isAward(c) ? awards : people).push(c);
  return { people, awards };
}
