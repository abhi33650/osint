"use client";

import * as React from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Circle,
  Polyline,
  useMap,
} from "react-leaflet";
import L from "leaflet";

// Fix default marker icon paths (bundlers drop Leaflet's relative assets).
const markerIcon = L.icon({
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

export interface MapPoint {
  lat: number;
  lng: number;
  label?: string;
  accuracy?: number | null;
  recordedAt?: string;
}

function Recenter({ point }: { point: MapPoint | null }) {
  const map = useMap();
  React.useEffect(() => {
    if (point) map.setView([point.lat, point.lng], map.getZoom() || 14);
  }, [point, map]);
  return null;
}

export default function MapView({
  latest,
  history = [],
  height = 420,
}: {
  latest: MapPoint | null;
  history?: MapPoint[];
  height?: number | string;
}) {
  const center: [number, number] = latest
    ? [latest.lat, latest.lng]
    : history[0]
      ? [history[0].lat, history[0].lng]
      : [20, 0];

  const path: [number, number][] = history.map((p) => [p.lat, p.lng]);

  // Stable id generated once per mount. If the component is remounted (e.g. by
  // Fast Refresh), a fresh instance gets a new key so React provides a clean
  // DOM node rather than one Leaflet has already claimed.
  const [mapKey] = React.useState(
    () => `map-${Math.random().toString(36).slice(2)}`
  );

  return (
    <MapContainer
      key={mapKey}
      center={center}
      zoom={latest || history.length ? 14 : 2}
      style={{ height, width: "100%", borderRadius: 10 }}
      scrollWheelZoom
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {path.length > 1 && (
        <Polyline positions={path} pathOptions={{ color: "#8b5cf6", weight: 3 }} />
      )}
      {latest && (
        <>
          <Marker position={[latest.lat, latest.lng]} icon={markerIcon}>
            <Popup>
              <strong>{latest.label ?? "Latest location"}</strong>
              <br />
              {latest.lat.toFixed(5)}, {latest.lng.toFixed(5)}
              {latest.accuracy != null && (
                <>
                  <br />± {Math.round(latest.accuracy)} m
                </>
              )}
              {latest.recordedAt && (
                <>
                  <br />
                  {new Date(latest.recordedAt).toLocaleString()}
                </>
              )}
            </Popup>
          </Marker>
          {latest.accuracy != null && latest.accuracy > 0 && (
            <Circle
              center={[latest.lat, latest.lng]}
              radius={latest.accuracy}
              pathOptions={{ color: "#8b5cf6", fillOpacity: 0.08 }}
            />
          )}
        </>
      )}
      <Recenter point={latest} />
    </MapContainer>
  );
}
