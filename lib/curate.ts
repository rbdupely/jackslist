// Pure helpers (no DB) for building curated lists and parsing search queries.
import type { Venue } from "@/lib/types";
import { CATEGORIES, normalizeCategory, type Category } from "@/lib/categories";
import { citySlug } from "@/lib/util";

export type CuratedList = {
  title: string;
  href: string;
  city: string | null;
  category: Category;
  venues: Venue[];
  count: number;
  topScore: number;
};

function topScoreOf(vs: Venue[]): number {
  return vs.reduce((m, v) => Math.max(m, v.jack_score ?? 0), 0);
}

// City + Category lists (e.g. "Best Pizza in New York City").
export function cityCategoryLists(venues: Venue[], minSize = 3): CuratedList[] {
  const groups = new Map<string, Venue[]>();
  for (const v of venues) {
    if (!v.city || !v.category) continue;
    const key = `${v.city}|||${v.category}`;
    const arr = groups.get(key);
    if (arr) arr.push(v);
    else groups.set(key, [v]);
  }
  const lists: CuratedList[] = [];
  for (const [key, vs] of groups) {
    if (vs.length < minSize) continue;
    const [city, category] = key.split("|||");
    lists.push({
      title: `Best ${category} in ${city}`,
      href: `/search?city=${encodeURIComponent(city)}&category=${encodeURIComponent(category)}`,
      city,
      category: category as Category,
      venues: vs,
      count: vs.length,
      topScore: topScoreOf(vs),
    });
  }
  return lists.sort((a, b) => b.topScore - a.topScore || b.count - a.count);
}

// Global category lists across all cities (e.g. "Best BBQ").
export function globalCategoryLists(
  venues: Venue[],
  categories: Category[],
): CuratedList[] {
  const lists: CuratedList[] = [];
  for (const category of categories) {
    const vs = venues.filter((v) => v.category === category);
    if (vs.length < 3) continue;
    lists.push({
      title: `Best ${category}`,
      href: `/search?category=${encodeURIComponent(category)}`,
      city: null,
      category,
      venues: vs,
      count: vs.length,
      topScore: topScoreOf(vs),
    });
  }
  return lists;
}

// The set of lists shown on the home page: a mix of the strongest city+category
// lists plus a few marquee global category lists, de-duplicated by title.
export function homeFeaturedLists(venues: Venue[]): CuratedList[] {
  const global = globalCategoryLists(venues, ["BBQ", "Steakhouse", "Pizza", "Sandwich Shop"]);
  const cityCat = cityCategoryLists(venues, 3).slice(0, 12);
  const seen = new Set<string>();
  const out: CuratedList[] = [];
  for (const l of [...cityCat.slice(0, 8), ...global, ...cityCat.slice(8)]) {
    if (seen.has(l.title)) continue;
    seen.add(l.title);
    out.push(l);
  }
  return out.slice(0, 9);
}

export function mostFeatured(venues: Venue[], limit = 8): Venue[] {
  return [...venues]
    .filter((v) => v.mention_count > 1)
    .sort((a, b) => b.mention_count - a.mention_count || (b.jack_score ?? 0) - (a.jack_score ?? 0))
    .slice(0, limit);
}

// ---- Query parsing (for search + the gap/request system) ------------------

export type ParsedQuery = {
  raw: string;
  category: Category | null;
  city: string | null;
  cuisine: string | null;
};

// Common abbreviations mapped to canonical city names (matched as whole words).
const CITY_ABBR: Record<string, string> = {
  nyc: "New York City",
  la: "Los Angeles",
  sf: "San Francisco",
  vegas: "Las Vegas",
};

function cityAliases(city: string): string[] {
  const l = city.toLowerCase();
  const out = [l];
  const noCity = l.replace(/\s+city$/, "");
  if (noCity !== l) out.push(noCity); // "New York City" -> also "new york"
  return out;
}

// Try to pull a category and a known city out of a free-text query like
// "best pizza in new york" or "tacos LA". `knownCities` comes from the DB so
// city detection stays accurate.
export function parseQuery(raw: string, knownCities: string[]): ParsedQuery {
  const lower = raw.toLowerCase().trim();
  const text = ` ${lower} `;
  const tokens = lower.split(/\s+/);
  let city: string | null = null;

  // Whole-word abbreviations first (avoid "la" matching inside other words).
  for (const [abbr, canonical] of Object.entries(CITY_ABBR)) {
    if (tokens.includes(abbr) && knownCities.some((c) => c === canonical)) {
      city = canonical;
      break;
    }
  }

  // Longest city name first, so "New York City" wins over "New York".
  if (!city) {
    for (const c of [...knownCities].sort((a, b) => b.length - a.length)) {
      if (cityAliases(c).some((a) => text.includes(` ${a}`))) {
        city = c;
        break;
      }
    }
  }

  let category: Category | null = null;
  for (const cat of CATEGORIES) {
    const needle = cat.toLowerCase();
    if (text.includes(needle)) {
      category = cat;
      break;
    }
  }
  // Fall back to keyword classifier (catches "pizzeria", "barbecue", etc.)
  if (!category) {
    const guess = normalizeCategory(raw);
    if (guess !== "Restaurant" || /\brestaurant\b/.test(text)) category = guess;
  }

  // Cuisine = what's left after removing filler + city + category words.
  let cuisine = lower;
  const strip = new Set([
    "best", "top", "good", "great", "the", "in", "near", "me", "for", "a", "of", "and",
  ]);
  if (city) {
    for (const a of cityAliases(city)) cuisine = cuisine.replaceAll(a, " ");
    const abbr = Object.entries(CITY_ABBR).find(([, c]) => c === city)?.[0];
    if (abbr) strip.add(abbr);
  }
  if (category) cuisine = cuisine.replaceAll(category.toLowerCase(), " ");
  cuisine = cuisine
    .split(/\s+/)
    .filter((w) => w && !strip.has(w))
    .join(" ")
    .trim();

  return { raw, category, city, cuisine: cuisine || null };
}

// Normalized key used to dedupe requests: city|category|cuisine, lowercased.
export function normalizedKey(p: ParsedQuery): string {
  return [p.city ?? "", p.category ?? "", p.cuisine ?? ""]
    .map((s) => s.toLowerCase().trim())
    .join("|");
}

export function requestPrompt(p: ParsedQuery): string {
  const what = p.category ?? p.cuisine ?? "spots";
  const where = p.city ? ` in ${p.city}` : "";
  const noun = p.cuisine && p.category ? `${p.cuisine} ${p.category.toLowerCase()}` : what;
  return `Jack hasn't reviewed the best ${noun}${where} yet`;
}

export { citySlug };
