import type { Item, GoogleHours } from "@/lib/types";
import { MapView } from "@/components/map/MapView";

// A real interactive map (Leaflet + free CARTO tiles, no API key) whenever we
// have coordinates. Degrades to an address card + "Open in Maps" link
// otherwise, so the page is fully useful even without coordinates.
export function ItemMap({ item }: { item: Item }) {
  const hasCoords = item.lat != null && item.lng != null;

  const mapsUrl =
    item.maps_url ??
    `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
      [item.name, item.city, item.country].filter(Boolean).join(", "),
    )}`;

  const hours = (item.hours as GoogleHours) ?? null;

  return (
    <div className="overflow-hidden rounded-card border border-line bg-paper">
      {hasCoords ? (
        <MapView
          heightClass="aspect-[16/9] w-full"
          points={[
            {
              lat: item.lat as number,
              lng: item.lng as number,
              name: item.name,
              href: mapsUrl,
              score: null,
              accent: "#ff3b2f",
              meta: [item.neighborhood, item.city].filter(Boolean).join(", ") || null,
            },
          ]}
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
