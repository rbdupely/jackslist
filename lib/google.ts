// SERVER-ONLY Google Places helpers. Uses the Places API (New) — a single
// Text Search call returns all the fields we need. Photos are served through
// our own /api/place-photo route so the key is never exposed to the browser.
import type { Item } from "@/lib/types";

const BASE = "https://places.googleapis.com/v1";

// Shaped for the `items` table. google_place_id lives inside external_ids,
// which callers must merge into the existing jsonb rather than replace.
export type EnrichmentFields = {
  google_place_id: string | null;
  address: string | null;
  lat: number | null;
  lng: number | null;
  google_rating: number | null;
  photo_url: string | null;
  maps_url: string | null;
  hours: { weekday_text?: string[] } | null;
  enriched_at: string;
};

function key(): string {
  const k = process.env.GOOGLE_MAPS_API_KEY;
  if (!k) throw new Error("GOOGLE_MAPS_API_KEY is not set");
  return k;
}

type NewPlace = {
  id?: string;
  formattedAddress?: string;
  location?: { latitude: number; longitude: number };
  rating?: number;
  googleMapsUri?: string;
  photos?: { name: string }[];
  regularOpeningHours?: { weekdayDescriptions?: string[] };
};

// One Text Search call, returning the full set of place fields.
async function searchPlace(query: string): Promise<NewPlace | null> {
  const res = await fetch(`${BASE}/places:searchText`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": key(),
      "X-Goog-FieldMask": [
        "places.id",
        "places.formattedAddress",
        "places.location",
        "places.rating",
        "places.googleMapsUri",
        "places.photos",
        "places.regularOpeningHours.weekdayDescriptions",
      ].join(","),
    },
    body: JSON.stringify({ textQuery: query, maxResultCount: 1 }),
  });
  const json = (await res.json()) as { places?: NewPlace[]; error?: { message?: string } };
  if (!res.ok || json.error) {
    // Surface real API errors (e.g. API not enabled, key restricted) instead of
    // silently reporting "no match".
    throw new Error(json.error?.message ?? `Places API HTTP ${res.status}`);
  }
  return json.places?.[0] ?? null;
}

// Look a venue up on Google and return the fields to persist, or null if no
// match was found.
export async function fetchEnrichment(
  item: Pick<Item, "name" | "city" | "country">,
  nowIso: string,
): Promise<EnrichmentFields | null> {
  const query = [item.name, item.city, item.country].filter(Boolean).join(", ");
  const p = await searchPlace(query);
  if (!p || !p.id) return null;

  const photoName = p.photos?.[0]?.name;
  return {
    google_place_id: p.id,
    address: p.formattedAddress ?? null,
    lat: p.location?.latitude ?? null,
    lng: p.location?.longitude ?? null,
    google_rating: p.rating ?? null,
    photo_url: photoName
      ? `/api/place-photo?name=${encodeURIComponent(photoName)}`
      : null,
    maps_url: p.googleMapsUri ?? null,
    hours: p.regularOpeningHours?.weekdayDescriptions
      ? { weekday_text: p.regularOpeningHours.weekdayDescriptions }
      : null,
    enriched_at: nowIso,
  };
}

// Fetch the raw photo bytes for a photo resource name (used by the photo proxy).
// `name` looks like "places/XXX/photos/YYY". The media endpoint 302-redirects to
// the actual image, which we follow.
export async function fetchPlacePhoto(name: string, maxWidth = 800): Promise<Response> {
  const url = `${BASE}/${name}/media?maxWidthPx=${maxWidth}&key=${key()}`;
  return fetch(url, { redirect: "follow" });
}
