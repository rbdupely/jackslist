// Server-side data access. Import only from Server Components / Actions.
import { createClient } from "@/lib/supabase/server";
import type { Venue, Mention, RequestRow } from "@/lib/types";
import { citySlug } from "@/lib/util";

export async function getAllVenues(): Promise<Venue[]> {
  const sb = await createClient();
  const { data, error } = await sb
    .from("venues")
    .select("*")
    .order("jack_score", { ascending: false, nullsFirst: false })
    .order("mention_count", { ascending: false })
    .order("name", { ascending: true });
  if (error) console.error("getAllVenues", error);
  return (data as Venue[]) ?? [];
}

export async function getVenueBySlug(
  slug: string,
): Promise<{ venue: Venue; mentions: Mention[] } | null> {
  const sb = await createClient();
  const { data: venue } = await sb
    .from("venues")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();
  if (!venue) return null;

  const { data: mentions } = await sb
    .from("mentions")
    .select("*")
    .eq("venue_id", (venue as Venue).id)
    .order("score", { ascending: false, nullsFirst: false })
    .order("publish_date", { ascending: false, nullsFirst: false });

  return { venue: venue as Venue, mentions: (mentions as Mention[]) ?? [] };
}

export async function getVenuesByCitySlug(slug: string): Promise<Venue[]> {
  // The city set is small; fetch all and match on slug so names like
  // "The Hamptons" round-trip cleanly.
  const all = await getAllVenues();
  return all.filter((v) => v.city && citySlug(v.city) === slug);
}

export type CityInfo = { city: string; slug: string; count: number; topScore: number };

export async function getCities(): Promise<CityInfo[]> {
  const all = await getAllVenues();
  const map = new Map<string, CityInfo>();
  for (const v of all) {
    if (!v.city) continue;
    const slug = citySlug(v.city);
    const existing = map.get(slug);
    if (existing) {
      existing.count += 1;
      existing.topScore = Math.max(existing.topScore, v.jack_score ?? 0);
    } else {
      map.set(slug, { city: v.city, slug, count: 1, topScore: v.jack_score ?? 0 });
    }
  }
  return [...map.values()].sort((a, b) => b.count - a.count);
}

export type SearchFilters = {
  q?: string;
  city?: string;
  category?: string;
  cuisine?: string;
  price?: string;
};

export async function searchVenues(f: SearchFilters): Promise<Venue[]> {
  const sb = await createClient();
  let query = sb.from("venues").select("*");

  const q = f.q?.trim();
  if (q) {
    const like = `%${q.replace(/[%,]/g, " ")}%`;
    query = query.or(
      [
        `name.ilike.${like}`,
        `cuisine_type.ilike.${like}`,
        `city.ilike.${like}`,
        `neighborhood.ilike.${like}`,
        `category.ilike.${like}`,
      ].join(","),
    );
  }
  if (f.city) query = query.ilike("city", f.city);
  if (f.category) query = query.eq("category", f.category);
  if (f.cuisine) query = query.ilike("cuisine_type", `%${f.cuisine}%`);
  if (f.price) query = query.eq("price_tier", f.price);

  const { data, error } = await query
    .order("jack_score", { ascending: false, nullsFirst: false })
    .order("mention_count", { ascending: false })
    .order("name", { ascending: true });

  if (error) console.error("searchVenues", error);
  return (data as Venue[]) ?? [];
}

export async function getRelatedVenues(venue: Venue, limit = 6): Promise<Venue[]> {
  if (!venue.city) return [];
  const sb = await createClient();
  const { data } = await sb
    .from("venues")
    .select("*")
    .ilike("city", venue.city)
    .neq("id", venue.id)
    .order("jack_score", { ascending: false, nullsFirst: false })
    .order("mention_count", { ascending: false })
    .limit(limit);
  return (data as Venue[]) ?? [];
}

export async function getRequests(): Promise<RequestRow[]> {
  const sb = await createClient();
  const { data } = await sb
    .from("requests")
    .select("*")
    .order("upvotes", { ascending: false })
    .order("created_at", { ascending: false });
  return (data as RequestRow[]) ?? [];
}
