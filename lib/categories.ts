// Food subtype normalization.
//
// In the OnlyCritics model, "category" is the top level (food, gaming, stocks,
// books, movies) and "subtype" is the in-category taxonomy. For food that's
// Pizza / BBQ / Deli / ... — the 15 values that drive curated lists, the
// category filter, and the search parser.
//
// The source data has ~50 raw strings, many compound ("Deli / sandwich shop",
// "Market/Food Hall"), which we collapse onto these.

export const FOOD_SUBTYPES = [
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

export type FoodSubtype = (typeof FOOD_SUBTYPES)[number];

// Keyword rules, evaluated in priority order. First match wins, so more
// specific concepts (pizza, bbq, steak) are checked before broad ones.
const RULES: Array<[FoodSubtype, RegExp]> = [
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

export function normalizeFoodSubtype(raw: string | null | undefined): FoodSubtype {
  const s = (raw ?? "").toLowerCase().trim();
  if (!s) return "Restaurant";
  for (const [cat, re] of RULES) {
    if (re.test(s)) return cat;
  }
  return "Restaurant";
}
