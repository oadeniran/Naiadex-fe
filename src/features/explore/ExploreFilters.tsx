import { useState } from "react";
import styles from "./explore.module.css";
import { RUBRIC_FILTER_KEYS, rubricFilterOptions, emptyExploreFilters, type ExploreFilterState } from "./exploreFilterConfig";
import type { Question } from "../../lib/types";

const TOKEN = import.meta.env.VITE_MAPBOX_TOKEN as string | undefined;

export default function ExploreFilters({
  rubric,
  state,
  setState,
}: {
  rubric: Record<string, Question>;
  state: ExploreFilterState;
  setState: (s: ExploreFilterState) => void;
}) {
  const [place, setPlace] = useState("");
  const [locating, setLocating] = useState(false);
  const [searching, setSearching] = useState(false);
  const [locMsg, setLocMsg] = useState<string | null>(null);

  function set<K extends keyof ExploreFilterState>(key: K, value: ExploreFilterState[K]) {
    setState({ ...state, [key]: value });
  }
  function setRubric(key: string, value: string) {
    setState({ ...state, rubric: { ...state.rubric, [key]: value } });
  }

  const hasActive =
    !!state.q ||
    !!state.overall ||
    !!state.near ||
    Object.values(state.rubric).some((v) => v);

  function clearAll() {
    setState(emptyExploreFilters);
    setPlace("");
    setLocMsg(null);
  }

  function useMyLocation() {
    if (!("geolocation" in navigator)) { setLocMsg("Location unavailable."); return; }
    setLocating(true); setLocMsg(null);
    navigator.geolocation.getCurrentPosition(
      (p) => { set("near", { lat: p.coords.latitude, lng: p.coords.longitude }); setLocating(false); },
      () => { setLocating(false); setLocMsg("Couldn't get your location."); },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  async function searchPlace() {
    if (!place.trim() || !TOKEN) return;
    setSearching(true); setLocMsg(null);
    try {
      const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(place.trim())}.json?access_token=${TOKEN}&limit=1`;
      const data = await (await fetch(url)).json();
      const c = data?.features?.[0]?.center;
      if (c) set("near", { lat: c[1], lng: c[0] });
      else setLocMsg("No match for that place.");
    } catch { setLocMsg("Place search failed."); }
    finally { setSearching(false); }
  }

  const activeRubric = RUBRIC_FILTER_KEYS.map((k) => rubric[k]).filter(Boolean) as Question[];

  return (
    <div className={styles.filterPanel}>
      <div className={styles.filterHead}>
        <span className={styles.filterHeadTitle}>Filters</span>
        {hasActive && (
          <button className={styles.clearAllBtn} onClick={clearAll}>Clear all</button>
        )}
      </div>
      <div className={styles.filterGroup}>
        <label className={styles.filterLabel}>Search</label>
        <input className={styles.filterInput} placeholder="Name or place…" value={state.q} onChange={(e) => set("q", e.target.value)} />
      </div>

      <div className={styles.filterGroup}>
        <label className={styles.filterLabel}>Overall health</label>
        <div className={styles.ratingChips}>
          {["", "GOOD", "MODERATE", "POOR"].map((r) => (
            <button key={r || "all"} className={`${styles.ratingChip} ${state.overall === r ? styles.ratingChipSel : ""}`} onClick={() => set("overall", r)}>
              {r ? r[0] + r.slice(1).toLowerCase() : "All"}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.filterGroup}>
        <label className={styles.filterLabel}>Location</label>
        <div className={styles.locControls}>
          <button className={styles.filterBtn} onClick={useMyLocation} disabled={locating}>
            {locating ? "Locating…" : state.near ? "✓ Centered" : "Near me"}
          </button>
          {TOKEN && (
            <div className={styles.searchRow}>
              <input className={styles.filterInput} placeholder="Near a place…" value={place}
                onChange={(e) => setPlace(e.target.value)} onKeyDown={(e) => e.key === "Enter" && searchPlace()} />
              <button className={styles.filterBtn} onClick={searchPlace} disabled={searching || !place.trim()}>{searching ? "…" : "Go"}</button>
            </div>
          )}
          {state.near && (
            <>
              <div className={styles.radiusRow}>
                <input type="range" min={1} max={200} value={state.radiusKm} onChange={(e) => set("radiusKm", Number(e.target.value))} className={styles.radiusSlider} />
                <input type="number" min={1} max={2000} value={state.radiusKm} onChange={(e) => set("radiusKm", Math.max(1, Number(e.target.value) || 1))} className={styles.radiusNum} />
                <span className={styles.radiusUnit}>km</span>
              </div>
              <button className={styles.clearLink} onClick={() => set("near", null)}>Clear location</button>
            </>
          )}
          {locMsg && <p className={styles.locMsg}>{locMsg}</p>}
        </div>
      </div>

      {activeRubric.map((q) => {
        const opts = rubricFilterOptions(q);
        return (
          <div key={q.key} className={styles.filterGroup}>
            <label className={styles.filterLabel}>{q.prompt}</label>
            <select className={styles.filterSelect} value={state.rubric[q.key] ?? ""} onChange={(e) => setRubric(q.key, e.target.value)}>
              <option value="">Any</option>
              {opts.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
        );
      })}
    </div>
  );
}