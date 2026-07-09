// Category normalization.
//
// The source data has ~50 raw category strings, many compound
// ("Deli / sandwich shop", "Restaurant / steakhouse", "Market/Food Hall").
// We collapse them to a clean, canonical primary category used for filtering,
// grouping, and curated-list titles.

export const CATEGORIES = [
  "Restaurant",
  "Pizza",
  "Sandwich Shop",
  "Steakhouse",
  "BBQ",
  "Deli",
  "Cafe",
  "Dessert",
  "Bar",
  "Street Food",
  "Food Truck",
  "Food Market",
  "Shop",
  "Hotel",
  "Activity",
] as const;

export type Category = (typeof CATEGORIES)[number];

// Keyword rules, evaluated in priority order. First match wins, so more
// specific concepts (pizza, bbq, steak) are checked before broad ones.
const RULES: Array<[Category, RegExp]> = [
  ["Pizza", /pizza|pizzeria/],
  ["BBQ", /bbq|barbecue|barbeque/],
  ["Steakhouse", /steak/],
  ["Deli", /\bdeli\b/],
  ["Sandwich Shop", /sandwich|panini|sub shop|hoagie/],
  ["Dessert", /dessert|ice cream|gelato|bakery|bakeries|donut|doughnut|pastry|patisserie|cake|charcuterie/],
  ["Cafe", /cafe|café|coffee|breakfast/],
  ["Hotel", /hotel/],
  ["Bar", /\bbar\b|pub|pincho|tavern/],
  ["Food Truck", /truck/],
  ["Street Food", /street|vendor|taco stand|stall|taqueria/],
  ["Food Market", /market|food hall|food court|grocery/],
  ["Shop", /\bshop\b|butcher|store/],
  ["Activity", /activity|stadium|experience/],
  ["Restaurant", /restaurant|fine dining|buffet|takeout|fast food/],
];

export function normalizeCategory(raw: string | null | undefined): Category {
  const s = (raw ?? "").toLowerCase().trim();
  if (!s) return "Restaurant";
  for (const [cat, re] of RULES) {
    if (re.test(s)) return cat;
  }
  return "Restaurant";
}
