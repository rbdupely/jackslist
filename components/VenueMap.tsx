import type { Venue, GoogleHours } from "@/lib/types";

// Renders a Google Maps embed when we have coordinates + an embed key.
// Degrades gracefully to an address card + "Open in Maps" link otherwise, so
// the page is fully useful before Phase 3 enrichment has run.
export function VenueMap({ venue }: { venue: Venue }) {
  const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_EMBED_KEY;
  const hasCoords = venue.lat != null && venue.lng != null;

  let embedSrc: string | null = null;
  if (key && (venue.google_place_id || hasCoords)) {
    const q = venue.google_place_id
      ? `place_id:${venue.google_place_id}`
      : `${venue.lat},${venue.lng}`;
    embedSrc = `https://www.google.com/maps/embed/v1/place?key=${key}&q=${encodeURIComponent(q)}&zoom=15`;
  }

  const mapsUrl =
    venue.maps_url ??
    `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
      [venue.name, venue.city, venue.country].filter(Boolean).join(", "),
    )}`;

  const hours = (venue.hours as GoogleHours) ?? null;

  return (
    <div className="overflow-hidden rounded-card border border-line bg-paper">
      {embedSrc ? (
        <iframe
          title={`Map of ${venue.name}`}
          src={embedSrc}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          className="aspect-[16/9] w-full border-0"
          allowFullScreen
        />
      ) : (
        <div className="flex aspect-[16/9] w-full items-center justify-center bg-gradient-to-br from-stone-100 to-orange-100">
          <div className="text-center">
            <div className="text-3xl">📍</div>
            <p className="mt-2 px-6 text-sm text-ink-soft">
              {venue.address ?? [venue.neighborhood, venue.city].filter(Boolean).join(", ") ??
                "Location coming soon"}
            </p>
          </div>
        </div>
      )}

      <div className="space-y-3 p-5">
        {venue.address && <p className="text-sm text-ink">{venue.address}</p>}

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
          {venue.google_rating != null && (
            <span className="inline-flex items-center gap-1 text-ink">
              <span className="text-gold">★</span>
              {venue.google_rating.toFixed(1)}
              <span className="text-ink-soft">Google</span>
            </span>
          )}
          <a
            href={mapsUrl}
            target="_blank"
            rel="noreferrer"
            className="font-medium text-flame hover:underline"
          >
            Open in Google Maps ↗
          </a>
        </div>

        {hours?.weekday_text && hours.weekday_text.length > 0 && (
          <details className="text-sm text-ink-soft">
            <summary className="cursor-pointer font-medium text-ink">Hours</summary>
            <ul className="mt-2 space-y-0.5">
              {hours.weekday_text.map((h) => (
                <li key={h}>{h}</li>
              ))}
            </ul>
          </details>
        )}
      </div>
    </div>
  );
}
