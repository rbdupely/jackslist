// Server-side data access. Import only from Server Components / Actions.
//
// Reads go through the items_scored view (items.* + take_count, critic_count,
// top_score, consensus_score) so listings can order and filter on scores
// directly. Writes go to items/takes.
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type {
  Category,
  Critic,
  RequestRow,
  ScoredItem,
  TakeWithCritic,
} from "@/lib/types";
import { citySlug } from "@/lib/util";

export const FOOD = "food";

const CRITIC_FIELDS = "id,slug,name,avatar_url,score_style";

export const getCategories = cache(async (): Promise<Category[]> => {
  const sb = await createClient();
  const { data, error } = await sb.from("categories").select("*").order("name");
  if (error) console.error("getCategories", error);
  return (data as Category[]) ?? [];
});

export const getCategoryBySlug = cache(async (slug: string): Promise<Category | null> => {
  const cats = await getCategories();
  return cats.find((c) => c.slug === slug) ?? null;
});

export async function getCriticsByCategory(slug: string): Promise<Critic[]> {
  const cat = await getCategoryBySlug(slug);
  if (!cat) return [];
  const sb = await createClient();
  const { data } = await sb
    .from("critics")
    .select("*")
    .eq("category_id", cat.id)
    .eq("active", true)
    .order("name");
  return (data as Critic[]) ?? [];
}

export async function getCriticBySlug(slug: string): Promise<Critic | null> {
  const sb = await createClient();
  const { data } = await sb.from("critics").select("*").eq("slug", slug).maybeSingle();
  return (data as Critic) ?? null;
}

// Every item in a category, ranked: best critic score, then how many takes.
export async function getAllItems(categorySlug = FOOD): Promise<ScoredItem[]> {
  const cat = await getCategoryBySlug(categorySlug);
  if (!cat) return [];
  const sb = await createClient();
  const { data, error } = await sb
    .from("items_scored")
    .select("*")
    .eq("category_id", cat.id)
    .order("top_score", { ascending: false, nullsFirst: false })
    .order("take_count", { ascending: false })
    .order("name", { ascending: true });
  if (error) console.error("getAllItems", error);
  return (data as ScoredItem[]) ?? [];
}

export async function getItemBySlug(
  categorySlug: string,
  slug: string,
): Promise<{ item: ScoredItem; takes: TakeWithCritic[] } | null> {
  const cat = await getCategoryBySlug(categorySlug);
  if (!cat) return null;
  const sb = await createClient();

  const { data: item } = await sb
    .from("items_scored")
    .select("*")
    .eq("category_id", cat.id)
    .eq("slug", slug)
    .maybeSingle();
  if (!item) return null;

  const { data: takes } = await sb
    .from("takes")
    .select(`*, critic:critics(${CRITIC_FIELDS})`)
    .eq("item_id", (item as ScoredItem).id)
    .order("score", { ascending: false, nullsFirst: false })
    .order("published_on", { ascending: false, nullsFirst: false });

  return { item: item as ScoredItem, takes: (takes as TakeWithCritic[]) ?? [] };
}

export async function getItemsByCitySlug(slug: string): Promise<ScoredItem[]> {
  // The city set is small; fetch and match on slug so "The Hamptons" round-trips.
  const all = await getAllItems(FOOD);
  return all.filter((v) => v.city && citySlug(v.city) === slug);
}

export type CityInfo = { city: string; slug: string; count: number; topScore: number };

export async function getCities(): Promise<CityInfo[]> {
  const all = await getAllItems(FOOD);
  const map = new Map<string, CityInfo>();
  for (const v of all) {
    if (!v.city) continue;
    const slug = citySlug(v.city);
    const existing = map.get(slug);
    if (existing) {
      existing.count += 1;
      existing.topScore = Math.max(existing.topScore, v.top_score ?? 0);
    } else {
      map.set(slug, { city: v.city, slug, count: 1, topScore: v.top_score ?? 0 });
    }
  }
  return [...map.values()].sort((a, b) => b.count - a.count);
}

export type SearchFilters = {
  q?: string;
  categorySlug?: string;
  city?: string;
  subtype?: string;
  cuisine?: string;
  price?: string;
};

export async function searchItems(f: SearchFilters): Promise<ScoredItem[]> {
  const cat = await getCategoryBySlug(f.categorySlug ?? FOOD);
  if (!cat) return [];
  const sb = await createClient();
  let query = sb.from("items_scored").select("*").eq("category_id", cat.id);

  const q = f.q?.trim();
  if (q) {
    const like = `%${q.replace(/[%,()]/g, " ")}%`;
    query = query.or(
      [
        `name.ilike.${like}`,
        `city.ilike.${like}`,
        `neighborhood.ilike.${like}`,
        `subtype.ilike.${like}`,
        `creator.ilike.${like}`,
      ].join(","),
    );
  }
  if (f.city) query = query.ilike("city", f.city);
  if (f.subtype) query = query.eq("subtype", f.subtype);
  if (f.cuisine) query = query.ilike("metadata->>cuisine", `%${f.cuisine}%`);
  if (f.price) query = query.eq("price_tier", f.price);

  const { data, error } = await query
    .order("top_score", { ascending: false, nullsFirst: false })
    .order("take_count", { ascending: false })
    .order("name", { ascending: true });

  if (error) console.error("searchItems", error);
  return (data as ScoredItem[]) ?? [];
}

export async function getRelatedItems(item: ScoredItem, limit = 6): Promise<ScoredItem[]> {
  if (!item.city) return [];
  const sb = await createClient();
  const { data } = await sb
    .from("items_scored")
    .select("*")
    .eq("category_id", item.category_id)
    .ilike("city", item.city)
    .neq("id", item.id)
    .order("top_score", { ascending: false, nullsFirst: false })
    .order("take_count", { ascending: false })
    .limit(limit);
  return (data as ScoredItem[]) ?? [];
}

export async function getRequests(categorySlug?: string): Promise<RequestRow[]> {
  const sb = await createClient();
  let q = sb.from("requests").select("*");
  if (categorySlug) {
    const cat = await getCategoryBySlug(categorySlug);
    if (!cat) return [];
    q = q.eq("category_id", cat.id);
  }
  const { data } = await q
    .order("upvotes", { ascending: false })
    .order("created_at", { ascending: false });
  return (data as RequestRow[]) ?? [];
}

// ---- Critics & categories -------------------------------------------------

export type CategoryStat = Category & { itemCount: number; criticCount: number };

export async function getCategoryStats(): Promise<CategoryStat[]> {
  const sb = await createClient();
  const cats = await getCategories();

  const [{ data: items }, { data: critics }] = await Promise.all([
    sb.from("items").select("category_id"),
    sb.from("critics").select("category_id").eq("active", true),
  ]);

  const itemBy = new Map<string, number>();
  for (const r of (items as { category_id: string }[]) ?? [])
    itemBy.set(r.category_id, (itemBy.get(r.category_id) ?? 0) + 1);
  const criticBy = new Map<string, number>();
  for (const r of (critics as { category_id: string }[]) ?? [])
    criticBy.set(r.category_id, (criticBy.get(r.category_id) ?? 0) + 1);

  const ORDER = ["food", "stocks", "books", "gaming", "movies"];
  return cats
    .map((c) => ({
      ...c,
      itemCount: itemBy.get(c.id) ?? 0,
      criticCount: criticBy.get(c.id) ?? 0,
    }))
    .sort((a, b) => ORDER.indexOf(a.slug) - ORDER.indexOf(b.slug));
}

export async function getAllCritics(): Promise<Critic[]> {
  const sb = await createClient();
  const { data } = await sb.from("critics").select("*").eq("active", true).order("name");
  return (data as Critic[]) ?? [];
}

// A critic's catalog: every item they've covered, with their representative
// take, ranked by their own score (or by how often they've covered it).
export type CriticItem = { item: ScoredItem; score: number | null; stance: string | null };

export async function getCriticCatalog(criticId: string): Promise<CriticItem[]> {
  const sb = await createClient();
  const { data: scores } = await sb
    .from("critic_item_scores")
    .select("item_id,score,stance")
    .eq("critic_id", criticId);

  const rows = (scores as { item_id: string; score: number | null; stance: string | null }[]) ?? [];
  if (!rows.length) return [];

  const { data: items } = await sb
    .from("items_scored")
    .select("*")
    .in(
      "id",
      rows.map((r) => r.item_id),
    );

  const byId = new Map((items as ScoredItem[] ?? []).map((i) => [i.id, i]));
  return rows
    .map((r) => ({ item: byId.get(r.item_id)!, score: r.score, stance: r.stance }))
    .filter((r) => r.item)
    .sort(
      (a, b) =>
        (b.score ?? -1) - (a.score ?? -1) ||
        b.item.take_count - a.item.take_count ||
        a.item.name.localeCompare(b.item.name),
    );
}

export async function getFollowedCriticIds(): Promise<Set<string>> {
  const sb = await createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return new Set();
  const { data } = await sb.from("follows").select("critic_id").eq("user_id", user.id);
  return new Set(((data as { critic_id: string }[]) ?? []).map((r) => r.critic_id));
}

export async function getFollowedCritics(): Promise<Critic[]> {
  const ids = await getFollowedCriticIds();
  if (!ids.size) return [];
  const sb = await createClient();
  const { data } = await sb.from("critics").select("*").in("id", [...ids]);
  return (data as Critic[]) ?? [];
}
