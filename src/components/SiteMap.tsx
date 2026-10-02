import { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import styles from "./siteMap.module.css";

const TOKEN = import.meta.env.VITE_MAPBOX_TOKEN as string | undefined;
if (TOKEN) mapboxgl.accessToken = TOKEN;

export type MapPoint = {
  id: string;          // stable key (site code, or user-site id, or "selected")
  name: string;
  lat: number;
  lng: number;
  polygon?: unknown | null;   // GeoJSON FeatureCollection or null
};

export default function SiteMap({
  points,
  selectedId,
  onSelect,
  height = 320,
}: {
  points: MapPoint[];
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  height?: number;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);

  // init once
  useEffect(() => {
    if (!TOKEN || !containerRef.current || mapRef.current) return;
    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: "mapbox://styles/mapbox/outdoors-v12",
      center: [0, 20],
      zoom: 1.2,
    });
    map.addControl(new mapboxgl.NavigationControl(), "top-right");
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // render markers + polygon whenever points/selection change
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const draw = () => {
      // clear old markers
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];

      // clear old polygon layer/source
      if (map.getLayer("sel-polygon-fill")) map.removeLayer("sel-polygon-fill");
      if (map.getLayer("sel-polygon-line")) map.removeLayer("sel-polygon-line");
      if (map.getSource("sel-polygon")) map.removeSource("sel-polygon");

      if (points.length === 0) return;

      const bounds = new mapboxgl.LngLatBounds();
      points.forEach((p) => {
        if (typeof p.lat !== "number" || typeof p.lng !== "number") return;
        const el = document.createElement("div");
        el.className = `${styles.marker} ${p.id === selectedId ? styles.markerSel : ""}`;
        const marker = new mapboxgl.Marker(el).setLngLat([p.lng, p.lat]).addTo(map);
        if (onSelect) el.addEventListener("click", () => onSelect(p.id));
        marker.setPopup(new mapboxgl.Popup({ offset: 18, closeButton: false }).setText(p.name));
        markersRef.current.push(marker);
        bounds.extend([p.lng, p.lat]);
      });

      // draw polygon of the selected site, if any
      const sel = points.find((p) => p.id === selectedId);
      if (sel?.polygon) {
        map.addSource("sel-polygon", { type: "geojson", data: sel.polygon as never });
        map.addLayer({
          id: "sel-polygon-fill", type: "fill", source: "sel-polygon",
          paint: { "fill-color": "#1f8a9b", "fill-opacity": 0.18 },
        });
        map.addLayer({
          id: "sel-polygon-line", type: "line", source: "sel-polygon",
          paint: { "line-color": "#0b5563", "line-width": 2 },
        });
      }

      // frame the view
      if (selectedId) {
        const s = points.find((p) => p.id === selectedId);
        if (s) map.flyTo({ center: [s.lng, s.lat], zoom: 13, duration: 800 });
      } else if (!bounds.isEmpty()) {
        map.fitBounds(bounds, { padding: 48, maxZoom: 12, duration: 0 });
      }
    };

    if (map.isStyleLoaded()) draw();
    else map.once("load", draw);
  }, [points, selectedId, onSelect]);

  if (!TOKEN) {
    return (
      <div className={styles.placeholder} style={{ height }}>
        Map unavailable — set VITE_MAPBOX_TOKEN to enable it.
      </div>
    );
  }
  return <div ref={containerRef} className={styles.map} style={{ height }} />;
}