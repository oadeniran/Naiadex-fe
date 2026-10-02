import { type ChangeEvent, useEffect, useRef, useState } from "react";
import styles from "./identify.module.css";
import { identify, getObservations, getAllObservations } from "../../lib/api";
import { getUsername } from "../../lib/user";
import FilterBar from "./FilterBar";
import { applyFilters, type FilterState } from "./filters";
import CompactCard from "./CompactCard";
import ObsMap from "./ObsMap";
import ObservationDetail from "./ObservationDetail";
import type { Observation } from "../../lib/types";
import LocationPicker from "../../components/LocationPicker";

export default function IdentifyFeature() {
  const username = getUsername() ?? "";
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [includeLocation, setIncludeLocation] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [latest, setLatest] = useState<Observation | null>(null);
  const [dex, setDex] = useState<Observation[]>([]);
  const [everyone, setEveryone] = useState<Observation[]>([]);
  const [scope, setScope] = useState<"mine" | "everyone">("mine");
  const [view, setView] = useState<"grid" | "map">("grid");
  const [openId, setOpenId] = useState<string | null>(null);
  const [filters, setFilters] = useState<FilterState>({});
  const [sortId, setSortId] = useState("newest");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [showPicker, setShowPicker] = useState(false);

  useEffect(() => { getObservations(username).then(setDex).catch(() => {}); }, [username]);
  useEffect(() => {
    if (scope === "everyone" && everyone.length === 0) getAllObservations().then(setEveryone).catch(() => {});
  }, [scope, everyone.length]);
  useEffect(() => {
    if (!file) { setPreview(null); return; }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  function onPick(e: ChangeEvent<HTMLInputElement>) { setFile(e.target.files?.[0] ?? null); setLatest(null); setError(null); }

  async function onIdentify() {
    if (!file) return;
    setLoading(true); setError(null);
    try {
      const obs = await identify(file, coords ?? undefined);
      setDex((p) => [obs, ...p]);
      setFile(null); setPreview(null); setCoords(null); setShowPicker(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (e) { setError(e instanceof Error ? e.message : String(e)); }
    finally { setLoading(false); }
  }

  function applyUpdate(updated: Observation) {
    setDex((p) => p.map((x) => (x.id === updated.id ? updated : x)));
    setEveryone((p) => p.map((x) => (x.id === updated.id ? updated : x)));
    if (latest?.id === updated.id) setLatest(updated);
  }

  if (openId) {
    return <ObservationDetail id={openId} username={username} onBack={() => setOpenId(null)} onUpdated={applyUpdate} />;
  }

  const list = scope === "mine" ? dex : everyone;

  return (
    <div className={styles.wrap}>
      <section className={styles.uploader}>
        <label className={styles.dropzone}>
          <input ref={fileInputRef} type="file" accept="image/*" capture="environment" onChange={onPick} className={styles.fileInput} />
          {preview ? <img src={preview} alt="Selected" className={styles.previewImg} /> : <span className={styles.dropText}>Tap to take or choose a photo of stream life</span>}
        </label>
        <div className={styles.locationSection}>
          {coords ? (
            <span className={styles.locationSet}>
              📍 {coords.lat.toFixed(4)}, {coords.lng.toFixed(4)}
              <button className={styles.linkBtn} onClick={() => setShowPicker((v) => !v)}>change</button>
              <button className={styles.linkBtn} onClick={() => setCoords(null)}>clear</button>
            </span>
          ) : (
            <button className={styles.linkBtn} onClick={() => setShowPicker((v) => !v)}>
              {showPicker ? "Hide location" : "+ Add location (optional)"}
            </button>
          )}
          {showPicker && (
            <div className={styles.pickerWrap}>
              <LocationPicker value={coords} onChange={(v) => setCoords(v)} />
            </div>
          )}
        </div>
        <button className={styles.identifyBtn} onClick={onIdentify} disabled={!file || loading}>{loading ? "Identifying…" : "Identify"}</button>
        {error && <p className={styles.error}>{error}</p>}
      </section>

      <section className={styles.dexSection}>
        <div className={styles.dexHeader}>
          <h2 className={styles.dexTitle}>
            {scope === "mine" ? "Your dex" : "Community dex"}
            <span className={styles.count}>{list.length}</span>
          </h2>
          <div className={styles.headerControls}>
            <div className={styles.toggle}>
              <button className={`${styles.toggleBtn} ${scope === "mine" ? styles.toggleActive : ""}`} onClick={() => setScope("mine")}>Mine</button>
              <button className={`${styles.toggleBtn} ${scope === "everyone" ? styles.toggleActive : ""}`} onClick={() => setScope("everyone")}>Community</button>
            </div>
            <div className={styles.toggle}>
              <button className={`${styles.toggleBtn} ${view === "grid" ? styles.toggleActive : ""}`} onClick={() => setView("grid")}>Grid</button>
              <button className={`${styles.toggleBtn} ${view === "map" ? styles.toggleActive : ""}`} onClick={() => setView("map")}>Map</button>
            </div>
          </div>
        </div>

        {list.length === 0 ? (
          <p className={styles.empty}>{scope === "mine" ? "No finds yet. Your first identification will appear here." : "No community finds yet."}</p>
        ) : (
          <>
            <FilterBar items={list} state={filters} setState={setFilters} sortId={sortId} setSortId={setSortId} />
            {(() => {
              const shown = applyFilters(list, filters, sortId);
              if (shown.length === 0) return <p className={styles.empty}>No finds match your filters.</p>;
              return view === "map" ? (
                <ObsMap items={shown} onOpen={setOpenId} />
              ) : (
                <div className={styles.dexGrid}>
                  {shown.map((o) => <CompactCard key={o.id} obs={o} showFinder={scope === "everyone"} onOpen={() => setOpenId(o.id)} />)}
                </div>
              );
            })()}
          </>
        )}
      </section>
    </div>
  );
}