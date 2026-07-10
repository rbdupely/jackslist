import Image from "next/image";
import type { Item } from "@/lib/types";

// Deterministic warm gradient placeholder when an item has no photo yet,
// so the grid still looks intentional.
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

export function ItemPhoto({
  item,
  className = "",
  sizes = "(max-width: 768px) 100vw, 33vw",
}: {
  item: Pick<Item, "name" | "slug" | "subtype" | "photo_url">;
  className?: string;
  sizes?: string;
}) {
  if (item.photo_url) {
    return (
      <Image
        src={item.photo_url}
        alt={item.name}
        fill
        sizes={sizes}
        className={`object-cover ${className}`}
      />
    );
  }
  return (
    <div
      className={`flex h-full w-full items-end bg-gradient-to-br ${pickGradient(
        item.slug,
      )} ${className}`}
    >
      <span className="p-3 font-display text-sm font-medium text-ink/60">
        {item.subtype ?? "Critic's pick"}
      </span>
    </div>
  );
}
