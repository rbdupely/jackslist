"use client";

import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster";
import "leaflet.markercluster/dist/MarkerCluster.css";

export type MapPoint = {
  lat: number;
  lng: number;
  name: string;
  href: string;
  score: number | null;
  meta?: string | null;
  // A single "you are here" marker (item page) uses a branded accent dot
  // instead of a score badge.
  accent?: string;
};

// Score → pin fill, matching the ScoreBadge tiers (elite/great/good/mixed) so a
// spot reads the same on the map as it does on a card.
function pinStyle(score: number | null): { bg: string; fg: string; ring: string } {
  const s = score ?? 0;
  if (s >= 9) return { bg: "#ff3b2f", fg: "#ffffff", ring: "rgba(255,255,255,.9)" };
  if (s >= 8) return { bg: "#17161a", fg: "#ffffff", ring: "rgba(255,255,255,.9)" };
  if (s >= 6.5) return { bg: "#ffffff", fg: "#17161a", ring: "rgba(255,255,255,.95)" };
  return { bg: "#8b8681", fg: "#ffffff", ring: "rgba(255,255,255,.9)" };
}

function label(score: number | null): string {
  if (score == null) return "•";
  return Number.isInteger(score) ? String(score) : score.toFixed(1);
}

function pinIcon(p: MapPoint): L.DivIcon {
  if (p.accent) {
    return L.divIcon({
      className: "oc-pin",
      html: `<div style="
        display:flex;align-items:center;justify-content:center;
        width:26px;height:26px;border-radius:9999px;
        background:${p.accent};
        box-shadow:0 1px 5px rgba(23,22,26,.4);
        border:3px solid #fff;
      "><span style="width:7px;height:7px;border-radius:9999px;background:#fff;display:block"></span></div>`,
      iconSize: [26, 26],
      iconAnchor: [13, 13],
      popupAnchor: [0, -14],
    });
  }
  const { bg, fg, ring } = pinStyle(p.score);
  return L.divIcon({
    className: "oc-pin",
    html: `<div style="
      display:flex;align-items:center;justify-content:center;
      width:30px;height:30px;border-radius:9999px;
      background:${bg};color:${fg};
      font:700 12px/1 ui-monospace,SFMono-Regular,Menlo,monospace;
      box-shadow:0 1px 4px rgba(23,22,26,.35);
      border:2px solid ${ring};
    ">${label(p.score)}</div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
    popupAnchor: [0, -14],
  });
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string,
  );
}

function popupHtml(p: MapPoint): string {
  const meta = p.meta
    ? `<div style="font-size:12px;color:#6b6660;margin-top:2px">${escapeHtml(p.meta)}</div>`
    : "";
  const score =
    p.score != null
      ? `<div style="font-size:12px;margin-top:4px;font-weight:600">Critic score ${label(
          p.score,
        )} / 10 →</div>`
      : "";
  return `<a href="${escapeHtml(p.href)}" style="text-decoration:none;color:#17161a">
    <div style="font-weight:700;font-size:14px">${escapeHtml(p.name)}</div>${meta}${score}</a>`;
}

// Brand-styled cluster bubble (flame circle with the count).
function clusterIcon(cluster: { getChildCount(): number }): L.DivIcon {
  const n = cluster.getChildCount();
  const size = n < 10 ? 34 : n < 100 ? 42 : 50;
  return L.divIcon({
    className: "oc-cluster",
    html: `<div style="
      width:${size}px;height:${size}px;border-radius:9999px;
      display:flex;align-items:center;justify-content:center;
      background:rgba(255,59,47,.92);color:#fff;
      font:700 13px/1 ui-monospace,SFMono-Regular,Menlo,monospace;
      border:2px solid #fff;box-shadow:0 2px 8px rgba(23,22,26,.35);
    ">${n}</div>`,
    iconSize: [size, size],
  });
}

// Imperative marker clustering (leaflet.markercluster). Kept out of react-leaflet's
// declarative tree so it works regardless of react-leaflet version.
function ClusterLayer({ points }: { points: MapPoint[] }) {
  const map = useMap();
  useEffect(() => {
    const group = (L as unknown as {
      markerClusterGroup(opts: object): L.LayerGroup & { getBounds(): L.LatLngBounds };
    }).markerClusterGroup({
      iconCreateFunction: clusterIcon,
      showCoverageOnHover: false,
      maxClusterRadius: 55,
      chunkedLoading: true,
    });
    for (const p of points) {
      L.marker([p.lat, p.lng], { icon: pinIcon(p) }).bindPopup(popupHtml(p)).addTo(group);
    }
    map.addLayer(group);
    if (points.length > 1) map.fitBounds(group.getBounds(), { padding: [36, 36] });
    return () => {
      map.removeLayer(group);
    };
  }, [map, points]);
  return null;
}

// Frames the view: one point → centered; many → fit all with padding.
function Fit({ points }: { points: MapPoint[] }) {
  const map = useMap();
  useEffect(() => {
    if (points.length === 1) {
      map.setView([points[0].lat, points[0].lng], 15);
    } else if (points.length > 1) {
      map.fitBounds(
        L.latLngBounds(points.map((p) => [p.lat, p.lng] as [number, number])),
        { padding: [36, 36] },
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}

export function LeafletMap({ points, cluster = false }: { points: MapPoint[]; cluster?: boolean }) {
  const center: [number, number] = points.length
    ? [points[0].lat, points[0].lng]
    : [39.8, -98.6]; // continental US fallback

  return (
    <MapContainer
      center={center}
      zoom={points.length > 1 ? 4 : 14}
      scrollWheelZoom={false}
      style={{ height: "100%", width: "100%" }}
    >
      <TileLayer
        // CARTO Voyager — free, no API key; the colorful, POI-forward style.
        url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
        subdomains={["a", "b", "c", "d"]}
        maxZoom={19}
      />
      {cluster ? (
        <ClusterLayer points={points} />
      ) : (
        <>
          <Fit points={points} />
          {points.map((p, i) => (
            <Marker key={`${p.href}-${i}`} position={[p.lat, p.lng]} icon={pinIcon(p)}>
              <Popup>
                <a href={p.href} style={{ textDecoration: "none", color: "inherit" }}>
                  <span
                    style={{ display: "block", fontWeight: 700, fontSize: 14, color: "#17161a" }}
                  >
                    {p.name}
                  </span>
                  {p.meta && (
                    <span style={{ display: "block", fontSize: 12, color: "#6b6660", marginTop: 2 }}>
                      {p.meta}
                    </span>
                  )}
                  {p.score != null && (
                    <span style={{ display: "block", fontSize: 12, marginTop: 4, fontWeight: 600 }}>
                      Critic score {label(p.score)} / 10 →
                    </span>
                  )}
                </a>
              </Popup>
            </Marker>
          ))}
        </>
      )}
    </MapContainer>
  );
}
