import Image from "next/image";
import { catUI } from "@/lib/ui";

// Real face when we have a free-licensed portrait; a tinted monogram otherwise.
// One place so faces render consistently across the whole site.
export function CriticAvatar({
  name,
  avatarUrl,
  categorySlug,
  size = 44,
  ring = false,
  className = "",
}: {
  name: string;
  avatarUrl: string | null | undefined;
  categorySlug: string;
  size?: number;
  ring?: boolean;
  className?: string;
}) {
  const ui = catUI(categorySlug);
  const ringCls = ring ? "ring-2 ring-surface" : "";
  if (avatarUrl) {
    // Wrap in a clipped, tinted circle so a loading or failed image still reads
    // as a clean avatar (no alt-text bleed, no transparent gap).
    return (
      <div
        style={{ width: size, height: size }}
        className={`relative shrink-0 overflow-hidden rounded-full ${ui.tint} ${ringCls} ${className}`}
      >
        <span
          aria-hidden
          className={`absolute inset-0 grid place-items-center font-display font-bold ${ui.text}`}
          style={{ fontSize: Math.round(size * 0.4) }}
        >
          {name.slice(0, 1)}
        </span>
        <Image
          src={avatarUrl}
          alt={name}
          width={size}
          height={size}
          className="relative h-full w-full object-cover"
        />
      </div>
    );
  }
  return (
    <div
      style={{ width: size, height: size, fontSize: Math.round(size * 0.4) }}
      className={`grid shrink-0 place-items-center rounded-full font-display font-bold ${ui.tint} ${ui.text} ${ringCls} ${className}`}
    >
      {name.slice(0, 1)}
    </div>
  );
}
