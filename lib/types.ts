// Row shapes mirroring the Supabase schema (supabase/schema.sql).

export type Venue = {
  id: string;
  name: string;
  slug: string;
  category: string | null;
  cuisine_type: string | null;
  city: string | null;
  neighborhood: string | null;
  country: string | null;
  price_tier: string | null;
  jack_score: number | null;
  mention_count: number;
  jack_blurb: string | null;
  google_place_id: string | null;
  address: string | null;
  lat: number | null;
  lng: number | null;
  google_rating: number | null;
  google_photo_url: string | null;
  maps_url: string | null;
  hours: unknown | null;
  enriched_at: string | null;
  created_at: string;
};

export type Mention = {
  id: string;
  venue_id: string;
  rec_id: string | null;
  verdict: string | null;
  sentiment: string | null;
  dishes_called_out: string | null;
  must_order: string | null;
  superlatives: string | null;
  best_of_language: boolean | null;
  source_platform: string | null;
  source_title: string | null;
  source_url: string | null;
  timestamp_sec: number | null;
  timestamp_label: string | null;
  publish_date: string | null;
  score: number | null;
  created_at: string;
};

export type RequestRow = {
  id: string;
  query_text: string | null;
  city: string | null;
  category: string | null;
  cuisine: string | null;
  normalized_key: string;
  upvotes: number;
  search_count: number;
  status: "Requested" | "Planned" | "Filmed";
  filled_venue_id: string | null;
  created_at: string;
};

export type GoogleHours = {
  weekday_text?: string[];
  open_now?: boolean;
} | null;
