import type { Item, GoogleHours } from "@/lib/types";

// Google Maps embed when we have coordinates + an embed key. Degrades to an
// address card + "Open in Maps" link otherwise, so the page is fully useful
// before enrichment has run.
export function ItemMap({ item }: { item: Item }) {
  const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_EMBED_KEY;
  const placeId = item.external_ids?.google_place_id;
  const hasCoords = item.lat != null && item.lng != null;

  let embedSrc: string | null = null;
  if (key && (placeId || hasCoords)) {
    const q = placeId ? `place_id:${placeId}` : `${item.lat},${item.lng}`;
    embedSrc = `https://www.google.com/maps/embed/v1/place?key=${key}&q=${encodeURIComponent(q)}&zoom=15`;
  }

  const mapsUrl =
    item.maps_url ??
    `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
      [item.name, item.city, item.country].filter(Boolean).join(", "),
    )}`;

  const hours = (item.hours as GoogleHours) ?? null;

  return (
    <div className="overflow-hidden rounded-card border border-line bg-paper">
      {embedSrc ? (
        <iframe
          title={`Map of ${item.name}`}
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
              {item.address ??
                [item.neighborhood, item.city].filter(Boolean).join(", ") ??
                "Location coming soon"}
            </p>
          </div>
        </div>
      )}

      <div className="space-y-3 p-5">
        {item.address && <p className="text-sm text-ink">{item.address}</p>}

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
          {item.google_rating != null && (
            <span className="inline-flex items-center gap-1 text-ink">
              <span className="text-gold">★</span>
              {item.google_rating.toFixed(1)}
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
