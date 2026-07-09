// SERVER-ONLY Google Places helpers. Uses the legacy Places API (Text Search +
// Details) with a single server-side key. Photos are served through our own
// /api/place-photo route so the key is never exposed to the browser.
import type { Venue } from "@/lib/types";

const BASE = "https://maps.googleapis.com/maps/api/place";

export type EnrichmentFields = {
  google_place_id: string | null;
  address: string | null;
  lat: number | null;
  lng: number | null;
  google_rating: number | null;
  google_photo_url: string | null;
  maps_url: string | null;
  hours: { weekday_text?: string[] } | null;
  enriched_at: string;
};

function key(): string {
  const k = process.env.GOOGLE_MAPS_API_KEY;
  if (!k) throw new Error("GOOGLE_MAPS_API_KEY is not set");
  return k;
}

async function textSearch(query: string): Promise<string | null> {
  const url = `${BASE}/textsearch/json?query=${encodeURIComponent(query)}&key=${key()}`;
  const res = await fetch(url);
  const json = (await res.json()) as {
    status: string;
    results?: { place_id: string }[];
  };
  if (json.status !== "OK" || !json.results?.length) return null;
  return json.results[0].place_id;
}

type Details = {
  place_id?: string;
  formatted_address?: string;
  geometry?: { location?: { lat: number; lng: number } };
  rating?: number;
  url?: string;
  photos?: { photo_reference: string }[];
  opening_hours?: { weekday_text?: string[] };
};

async function placeDetails(placeId: string): Promise<Details | null> {
  const fields = [
    "place_id",
    "formatted_address",
    "geometry/location",
    "rating",
    "url",
    "photos",
    "opening_hours",
  ].join(",");
  const url = `${BASE}/details/json?place_id=${placeId}&fields=${fields}&key=${key()}`;
  const res = await fetch(url);
  const json = (await res.json()) as { status: string; result?: Details };
  if (json.status !== "OK" || !json.result) return null;
  return json.result;
}

// Look a venue up on Google and return the fields to persist, or null if no
// confident match was found.
export async function fetchEnrichment(
  venue: Pick<Venue, "name" | "city" | "country">,
  nowIso: string,
): Promise<EnrichmentFields | null> {
  const query = [venue.name, venue.city, venue.country].filter(Boolean).join(", ");
  const placeId = await textSearch(query);
  if (!placeId) return null;

  const d = await placeDetails(placeId);
  if (!d) return null;

  const photoRef = d.photos?.[0]?.photo_reference;
  return {
    google_place_id: d.place_id ?? placeId,
    address: d.formatted_address ?? null,
    lat: d.geometry?.location?.lat ?? null,
    lng: d.geometry?.location?.lng ?? null,
    google_rating: d.rating ?? null,
    google_photo_url: photoRef ? `/api/place-photo?ref=${encodeURIComponent(photoRef)}` : null,
    maps_url: d.url ?? null,
    hours: d.opening_hours?.weekday_text ? { weekday_text: d.opening_hours.weekday_text } : null,
    enriched_at: nowIso,
  };
}

// Fetch the raw photo bytes for a reference (used by the photo proxy route).
export async function fetchPlacePhoto(
  ref: string,
  maxWidth = 800,
): Promise<Response> {
  const url = `${BASE}/photo?maxwidth=${maxWidth}&photo_reference=${encodeURIComponent(ref)}&key=${key()}`;
  return fetch(url, { redirect: "follow" });
}
