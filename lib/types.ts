// Row shapes mirroring the OnlyCritics schema (supabase/migrations/0001_onlycritics.sql).

export type Category = {
  id: string;
  slug: string;
  name: string;
  item_noun: string;
};

export type Critic = {
  id: string;
  slug: string;
  name: string;
  category_id: string;
  platform: string | null;
  source_url: string | null;
  avatar_url: string | null;
  bio: string | null;
  score_style: "numeric" | "stance";
  active: boolean;
};

export type Item = {
  id: string;
  category_id: string;
  slug: string;
  name: string;
  subtype: string | null; // in-category taxonomy: Pizza / RPG / Memoir
  creator: string | null;
  year: number | null;
  city: string | null;
  neighborhood: string | null;
  country: string | null;
  price_tier: string | null;
  lat: number | null;
  lng: number | null;
  photo_url: string | null;
  external_ids: Record<string, string> | null;
  crowd_score: number | null;
  crowd_scale: string | null;
  crowd_source: string | null;
  crowd_url: string | null;
  metadata: Record<string, string> | null;
  address: string | null;
  google_rating: number | null;
  maps_url: string | null;
  hours: unknown | null;
  enriched_at: string | null;
  created_at: string;
};

// The items_scored view: every item column plus per-item aggregates.
// consensus_score is non-null only when >= 2 critics have scored the item.
export type ScoredItem = Item & {
  take_count: number;
  critic_count: number;
  top_score: number | null;
  consensus_score: number | null;
  scored_critic_count: number;
};

export type Take = {
  id: string;
  critic_id: string;
  item_id: string;
  verdict: string | null;
  score: number | null;
  score_original: string | null;
  stance: string | null;
  highlights: string | null;
  superlatives: string | null;
  best_of_language: boolean | null;
  source_platform: string | null;
  source_title: string | null;
  source_url: string | null;
  timestamp_sec: number | null;
  published_on: string | null;
  position_details: Record<string, unknown> | null;
  metadata: Record<string, string> | null;
  created_at: string;
};

export type CriticRef = Pick<Critic, "id" | "slug" | "name" | "avatar_url" | "score_style">;

export type TakeWithCritic = Take & { critic: CriticRef };

export type RequestRow = {
  id: string;
  query_text: string | null;
  category_id: string | null;
  subject: string | null;
  city: string | null;
  category: string | null; // legacy free-text, retained until 0002
  cuisine: string | null; // legacy
  normalized_key: string;
  upvotes: number;
  search_count: number;
  status: "Requested" | "Planned" | "Covered";
  filled_item_id: string | null;
  created_at: string;
};

export type GoogleHours = {
  weekday_text?: string[];
} | null;

// Convenience: the cuisine descriptor lives in metadata for food items.
export function itemCuisine(item: Pick<Item, "metadata">): string | null {
  return item.metadata?.cuisine ?? null;
}
