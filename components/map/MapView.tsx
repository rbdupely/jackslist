"use client";

import dynamic from "next/dynamic";
import type { MapPoint } from "./LeafletMap";

// Leaflet touches `window` at import time, so the map must be client-only.
// A client component can dynamic-import with ssr:false; a server page cannot.
const LeafletMap = dynamic(() => import("./LeafletMap").then((m) => m.LeafletMap), {
  ssr: false,
  loading: () => <div className="h-full w-full animate-pulse bg-sunk" />,
});

export function MapView({
  points,
  heightClass = "h-80",
  className = "",
  cluster = false,
}: {
  points: MapPoint[];
  heightClass?: string;
  className?: string;
  cluster?: boolean;
}) {
  return (
    <div className={`relative isolate overflow-hidden ${heightClass} ${className}`}>
      <LeafletMap points={points} cluster={cluster} />
    </div>
  );
}

export type { MapPoint };
