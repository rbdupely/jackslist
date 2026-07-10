// Turns Google Places enrichment into an `items` update patch.
//
// Two rules that matter:
//  - external_ids is merged, never replaced (it also carries ticker/isbn/tmdb_id).
//  - a null photo from Google never clobbers an existing photo (e.g. the
//    video-thumbnail fallback).
import type { EnrichmentFields } from "@/lib/google";
import type { Item } from "@/lib/types";

export function enrichmentPatch(
  item: Pick<Item, "external_ids" | "photo_url">,
  fields: EnrichmentFields,
): Record<string, unknown> {
  const { google_place_id, photo_url, ...rest } = fields;

  const patch: Record<string, unknown> = { ...rest };

  patch.external_ids = {
    ...(item.external_ids ?? {}),
    ...(google_place_id ? { google_place_id } : {}),
  };

  if (photo_url) patch.photo_url = photo_url;

  return patch;
}
