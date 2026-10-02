import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import styles from "./locationPicker.module.css";

const TOKEN = import.meta.env.VITE_MAPBOX_TOKEN as string | undefined;
if (TOKEN) mapboxgl.accessToken = TOKEN;

export type LatLng = { lat: number; lng: number };

export default function LocationPicker({
  value,
  onChange,
}: {
  value: LatLng | null;
  onChange: (v: LatLng) => void;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markerRef = useRef<mapboxgl.Marker | null>(null);

  const [latText, setLatText] = useState(value ? String(value.lat) : "");
  const [lngText, setLngText] = useState(value ? String(value.lng) : "");
  const [address, setAddress] = useState("");
  const [searching, setSearching] = useState(false);
  const [locating, setLocating] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  // keep raw fields in sync when value changes from map/gps/search
  useEffect(() => {
    if (value) {
      setLatText(value.lat.toFixed(6));
      setLngText(value.lng.toFixed(6));
    }
  }, [value]);

  // init map once
  useEffect(() => {
    if (!TOKEN || !containerRef.current || mapRef.current) return;
    const start = value ?? { lat: 20, lng: 0 };
    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: "mapbox://styles/mapbox/outdoors-v12",
      center: [start.lng, start.lat],
      zoom: value ? 12 : 1.4,
    });
    map.addControl(new mapboxgl.NavigationControl(), "top-right");

    const marker = new mapboxgl.Marker({ draggable: true, color: "#0b7a8c" })
      .setLngLat([start.lng, start.lat])
      .addTo(map);
    marker.on("dragend", () => {
      const { lat, lng } = marker.getLngLat();
      onChange({ lat, lng });
    });
    // click map to move pin
    map.on("click", (e) => {
      marker.setLngLat(e.lngLat);
      onChange({ lat: e.lngLat.lat, lng: e.lngLat.lng });
    });

    mapRef.current = map;
    markerRef.current = marker;
    return () => { map.remove(); mapRef.current = null; markerRef.current = null; };
  }, []);

  // move pin + recenter when value changes externally (gps / search / raw)
  useEffect(() => {
    if (!value || !mapRef.current || !markerRef.current) return;
    markerRef.current.setLngLat([value.lng, value.lat]);
    mapRef.current.flyTo({ center: [value.lng, value.lat], zoom: 13, duration: 600 });
  }, [value?.lat, value?.lng]);

  function useMyLocation() {
    if (!("geolocation" in navigator)) { setStatus("Location not available in this browser."); return; }
    setLocating(true); setStatus(null);
    navigator.geolocation.getCurrentPosition(
      (p) => { onChange({ lat: p.coords.latitude, lng: p.coords.longitude }); setLocating(false); },
      (e) => {
        setLocating(false);
        setStatus(e.code === e.PERMISSION_DENIED ? "Permission denied — set it another way." : "Couldn't get your location.");
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }

  async function searchAddress() {
    if (!address.trim() || !TOKEN) return;
    setSearching(true); setStatus(null);
    try {
      const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(address.trim())}.json?access_token=${TOKEN}&limit=1`;
      const res = await fetch(url);
      const data = await res.json();
      const feat = data?.features?.[0];
      if (feat?.center) {
        onChange({ lng: feat.center[0], lat: feat.center[1] });
      } else {
        setStatus("No match found for that address.");
      }
    } catch {
      setStatus("Address search failed — set it another way.");
    } finally {
      setSearching(false);
    }
  }

  function applyRaw() {
    const lat = parseFloat(latText);
    const lng = parseFloat(lngText);
    if (Number.isNaN(lat) || Number.isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      setStatus("Enter valid coordinates (lat -90..90, lng -180..180).");
      return;
    }
    setStatus(null);
    onChange({ lat, lng });
  }

  return (
    <div className={styles.picker}>
      <div className={styles.methods}>
        <button type="button" className={styles.methodBtn} onClick={useMyLocation} disabled={locating}>
          {locating ? "Locating…" : "📍 Use my location"}
        </button>
        {TOKEN && (
          <div className={styles.searchRow}>
            <input
              className={styles.input}
              placeholder="Search an address or place…"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && searchAddress()}
            />
            <button type="button" className={styles.methodBtn} onClick={searchAddress} disabled={searching || !address.trim()}>
              {searching ? "…" : "Search"}
            </button>
          </div>
        )}
      </div>

      {TOKEN ? (
        <>
          <div ref={containerRef} className={styles.map} />
          <p className={styles.hint}>Tap the map or drag the pin to set the exact spot.</p>
        </>
      ) : (
        <p className={styles.hint}>Map unavailable — enter coordinates below.</p>
      )}

      <div className={styles.rawRow}>
        <input className={styles.input} placeholder="Latitude" value={latText} onChange={(e) => setLatText(e.target.value)} />
        <input className={styles.input} placeholder="Longitude" value={lngText} onChange={(e) => setLngText(e.target.value)} />
        <button type="button" className={styles.methodBtn} onClick={applyRaw}>Set</button>
      </div>

      {value && (
        <p className={styles.current}>Selected: {value.lat.toFixed(5)}, {value.lng.toFixed(5)}</p>
      )}
      {status && <p className={styles.status}>{status}</p>}
    </div>
  );
}