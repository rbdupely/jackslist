// Pure helpers (no DB) for building curated lists and parsing search queries.
import type { ScoredItem } from "@/lib/types";
import { FOOD_SUBTYPES, normalizeFoodSubtype, type FoodSubtype } from "@/lib/categories";
import { citySlug } from "@/lib/util";

export type CuratedList = {
  title: string;
  href: string;
  city: string | null;
  subtype: FoodSubtype;
  items: ScoredItem[];
  count: number;
  topScore: number;
};

function topScoreOf(vs: ScoredItem[]): number {
  return vs.reduce((m, v) => Math.max(m, v.top_score ?? 0), 0);
}

// City + subtype lists (e.g. "Best Pizza in New York City").
export function cityCategoryLists(items: ScoredItem[], minSize = 3): CuratedList[] {
  const groups = new Map<string, ScoredItem[]>();
  for (const v of items) {
    if (!v.city || !v.subtype) continue;
    const key = `${v.city}|||${v.subtype}`;
    const arr = groups.get(key);
    if (arr) arr.push(v);
    else groups.set(key, [v]);
  }
  const lists: CuratedList[] = [];
  for (const [key, vs] of groups) {
    if (vs.length < minSize) continue;
    const [city, subtype] = key.split("|||");
    lists.push({
      title: `Best ${subtype} in ${city}`,
      href: `/search?city=${encodeURIComponent(city)}&subtype=${encodeURIComponent(subtype)}`,
      city,
      subtype: subtype as FoodSubtype,
      items: vs,
      count: vs.length,
      topScore: topScoreOf(vs),
    });
  }
  return lists.sort((a, b) => b.topScore - a.topScore || b.count - a.count);
}

// Global subtype lists across all cities (e.g. "Best BBQ").
export function globalCategoryLists(
  items: ScoredItem[],
  subtypes: FoodSubtype[],
): CuratedList[] {
  const lists: CuratedList[] = [];
  for (const subtype of subtypes) {
    const vs = items.filter((v) => v.subtype === subtype);
    if (vs.length < 3) continue;
    lists.push({
      title: `Best ${subtype}`,
      href: `/search?subtype=${encodeURIComponent(subtype)}`,
      city: null,
      subtype,
      items: vs,
      count: vs.length,
      topScore: topScoreOf(vs),
    });
  }
  return lists;
}

export function homeFeaturedLists(items: ScoredItem[]): CuratedList[] {
  const global = globalCategoryLists(items, ["BBQ", "Steakhouse", "Pizza", "Sandwich Shop"]);
  const cityCat = cityCategoryLists(items, 3).slice(0, 12);
  const seen = new Set<string>();
  const out: CuratedList[] = [];
  for (const l of [...cityCat.slice(0, 8), ...global, ...cityCat.slice(8)]) {
    if (seen.has(l.title)) continue;
    seen.add(l.title);
    out.push(l);
  }
  return out.slice(0, 9);
}

export function mostFeatured(items: ScoredItem[], limit = 8): ScoredItem[] {
  return [...items]
    .filter((v) => v.take_count > 1)
    .sort((a, b) => b.take_count - a.take_count || (b.top_score ?? 0) - (a.top_score ?? 0))
    .slice(0, limit);
}

// ---- Query parsing (for search + the gap/request system) ------------------

export type ParsedQuery = {
  raw: string;
  subtype: FoodSubtype | null;
  city: string | null;
  cuisine: string | null;
};

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

export function parseQuery(raw: string, knownCities: string[]): ParsedQuery {
  const lower = raw.toLowerCase().trim();
  const text = ` ${lower} `;
  const tokens = lower.split(/\s+/);
  let city: string | null = null;

  for (const [abbr, canonical] of Object.entries(CITY_ABBR)) {
    if (tokens.includes(abbr) && knownCities.some((c) => c === canonical)) {
      city = canonical;
      break;
    }
  }

  if (!city) {
    for (const c of [...knownCities].sort((a, b) => b.length - a.length)) {
      if (cityAliases(c).some((a) => text.includes(` ${a}`))) {
        city = c;
        break;
      }
    }
  }

  let subtype: FoodSubtype | null = null;
  for (const cat of FOOD_SUBTYPES) {
    if (text.includes(cat.toLowerCase())) {
      subtype = cat;
      break;
    }
  }
  if (!subtype) {
    const guess = normalizeFoodSubtype(raw);
    if (guess !== "Restaurant" || /\brestaurant\b/.test(text)) subtype = guess;
  }

  let cuisine = lower;
  const strip = new Set([
    "best", "top", "good", "great", "the", "in", "near", "me", "for", "a", "of", "and",
  ]);
  if (city) {
    for (const a of cityAliases(city)) cuisine = cuisine.replaceAll(a, " ");
    const abbr = Object.entries(CITY_ABBR).find(([, c]) => c === city)?.[0];
    if (abbr) strip.add(abbr);
  }
  if (subtype) cuisine = cuisine.replaceAll(subtype.toLowerCase(), " ");
  cuisine = cuisine
    .split(/\s+/)
    .filter((w) => w && !strip.has(w))
    .join(" ")
    .trim();

  return { raw, subtype, city, cuisine: cuisine || null };
}

// The request system keys on category|subject|qualifier.
export function requestSubject(p: ParsedQuery): string {
  return (p.subtype ?? p.cuisine ?? p.raw).trim();
}

export function requestQualifier(p: ParsedQuery): string {
  return p.city ?? "";
}

export function requestPrompt(p: ParsedQuery): string {
  const noun =
    p.cuisine && p.subtype
      ? `${p.cuisine} ${p.subtype.toLowerCase()}`
      : p.subtype ?? p.cuisine ?? "spots";
  const where = p.city ? ` in ${p.city}` : "";
  return `No critic has covered the best ${noun}${where} yet`;
}

export { citySlug };
