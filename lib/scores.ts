// Normalize a critic's own score notation to a 0-10 scale.
//
// The circular badge is always 0-10, but critics score in many scales (letter
// grades, N/5 stars, percentages, N/4). This turns their notation into a 0-10
// number while `score_original` preserves what they actually gave.
//
// Returns null when the notation is verdict-only ("Buy", "Recommended") or
// unparseable — those critics render a stance chip, not a badge.

const LETTER: Record<string, number> = {
  "A+": 10, A: 9.5, "A-": 9,
  "B+": 8.5, B: 8, "B-": 7.5,
  "C+": 7, C: 6.5, "C-": 6,
  "D+": 5, D: 4.5, "D-": 4,
  F: 2,
};

// Jeremy Jahns' tier scale, highest to lowest (approximate 0-10 mapping;
// a curator can always override with an explicit numeric score).
const JAHNS: Record<string, number> = {
  awesometacular: 9.5,
  "a good time": 8,
  "worth watching": 7,
  "dollar theater": 5,
  "wait and watch nothing": 3,
  "don't waste your time": 2,
};

export function normalizeScore(raw: string | null | undefined): number | null {
  if (!raw) return null;
  const s = raw.trim();
  if (!s) return null;

  const clamp = (n: number) => Math.max(0, Math.min(10, Math.round(n * 10) / 10));

  // Letter grade: A+, B-, C ...
  const letter = s.toUpperCase().match(/^([A-F][+-]?)$/);
  if (letter && LETTER[letter[1]] != null) return LETTER[letter[1]];

  // Jahns tier by name.
  const jahns = JAHNS[s.toLowerCase()];
  if (jahns != null) return jahns;

  // Star glyphs: ★★★½  (out of 5)
  if (/[★☆½]/.test(s)) {
    const full = (s.match(/★/g) || []).length;
    const half = /½/.test(s) ? 0.5 : 0;
    return clamp((full + half) * 2);
  }

  // Percent: 84%
  const pct = s.match(/^(\d{1,3})\s*%$/);
  if (pct) return clamp(Number(pct[1]) / 10);

  // Fraction: N/10, N/5, N/4, N/100
  const frac = s.match(/^(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)$/);
  if (frac) {
    const [num, den] = [Number(frac[1]), Number(frac[2])];
    if (den > 0) return clamp((num / den) * 10);
  }

  // "4.5 stars", "4/5 stars"
  const stars = s.match(/^(\d+(?:\.\d+)?)\s*(?:\/\s*5\s*)?stars?$/i);
  if (stars) return clamp(Number(stars[1]) * 2);

  // Bare number: assume already 0-10 if <=10, else treat as a percent-ish 0-100.
  const bare = s.match(/^(\d+(?:\.\d+)?)$/);
  if (bare) {
    const n = Number(bare[1]);
    return clamp(n <= 10 ? n : n / 10);
  }

  return null;
}
