"use client";

import { useMemo, useState } from "react";
import { MapView, type MapPoint } from "./MapView";

const THRESHOLDS = [
  { label: "All", min: 0 },
  { label: "7+", min: 7 },
  { label: "8+", min: 8 },
  { label: "9+", min: 9 },
];

// The map with a live filter bar. Score threshold is the one filter our data
// actually supports meaningfully today (one cuisine, one mapped critic); the
// segmented control reshapes the pins/clusters instantly, client-side.
export function MapExplorer({
  points,
  cluster = false,
  heightClass = "h-[460px]",
  className = "",
  nounPlural = "spots",
}: {
  points: MapPoint[];
  cluster?: boolean;
  heightClass?: string;
  className?: string;
  nounPlural?: string;
}) {
  const [min, setMin] = useState(0);
  const filtered = useMemo(
    () => (min <= 0 ? points : points.filter((p) => (p.score ?? -1) >= min)),
    [points, min],
  );

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-soft">
            Critic score
          </span>
          <div className="inline-flex rounded-full border border-line bg-surface p-0.5">
            {THRESHOLDS.map((t) => (
              <button
                key={t.label}
                type="button"
                onClick={() => setMin(t.min)}
                className={`tnum rounded-full px-3 py-1 text-sm font-medium transition ${
                  min === t.min ? "bg-ink text-white" : "text-ink-soft hover:text-ink"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
        <span className="tnum text-sm text-ink-soft">
          {filtered.length.toLocaleString()} {nounPlural}
        </span>
      </div>
      <MapView
        points={filtered}
        cluster={cluster}
        heightClass={heightClass}
        className={className}
      />
    </div>
  );
}

export type { MapPoint };
