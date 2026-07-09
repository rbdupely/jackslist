import Image from "next/image";
import type { Venue } from "@/lib/types";

// Deterministic warm gradient placeholder when there's no Google photo yet,
// so the grid still looks intentional pre-enrichment.
const GRADIENTS = [
  "from-orange-200 to-rose-200",
  "from-amber-200 to-orange-300",
  "from-rose-200 to-red-200",
  "from-yellow-200 to-amber-300",
  "from-stone-200 to-orange-200",
  "from-red-200 to-orange-200",
];

function pickGradient(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return GRADIENTS[h % GRADIENTS.length];
}

export function VenuePhoto({
  venue,
  className = "",
  sizes = "(max-width: 768px) 100vw, 33vw",
}: {
  venue: Pick<Venue, "name" | "slug" | "category" | "google_photo_url">;
  className?: string;
  sizes?: string;
}) {
  if (venue.google_photo_url) {
    return (
      <Image
        src={venue.google_photo_url}
        alt={venue.name}
        fill
        sizes={sizes}
        className={`object-cover ${className}`}
      />
    );
  }
  return (
    <div
      className={`flex h-full w-full items-end bg-gradient-to-br ${pickGradient(
        venue.slug,
      )} ${className}`}
    >
      <span className="p-3 font-display text-sm font-medium text-ink/60">
        {venue.category ?? "Jack's pick"}
      </span>
    </div>
  );
}
