import { useEffect, useMemo, useState } from "react";
import styles from "../assess.module.css";
import { getSites, getMySites, createMySite, deleteMySite, getSite } from "../../../lib/api";
import { getUsername } from "../../../lib/user";
import type { Site, UserSite, SiteRef } from "../../../lib/types";
import type { AssessDraft, Action } from "../assessState";
import SiteMap, { type MapPoint } from "../../../components/SiteMap";
import LocationPicker, { type LatLng } from "../../../components/LocationPicker";

type Props = { draft: AssessDraft; dispatch: React.Dispatch<Action> };

export default function StepSite({ draft, dispatch }: Props) {
  const username = getUsername() ?? "";
  const [sites, setSites] = useState<Site[]>([]);
  const [mine, setMine] = useState<UserSite[]>([]);
  const [city, setCity] = useState<string>("");
  const [adding, setAdding] = useState(false);
  const [selectedPolygon, setSelectedPolygon] = useState<unknown | null>(null);

  useEffect(() => {
    setSelectedPolygon(null);
    const code = draft.site?.type === "existing" ? draft.site.code : null;
    if (!code) return;
    let alive = true;
    getSite(code).then((s) => alive && setSelectedPolygon(s.polygon ?? null)).catch(() => {});
    return () => { alive = false; };
  }, [draft.site?.code, draft.site?.type]);

  useEffect(() => {
    getSites().then(setSites).catch(() => {});
    getMySites(username).then(setMine).catch(() => {});
  }, [username]);

  // the id currently selected, in map terms
  const selectedMapId =
    draft.site?.type === "existing"
      ? draft.site.code ?? null
      : mine.find((m) => m.name === draft.site?.name)
      ? `mine:${mine.find((m) => m.name === draft.site?.name)!.id}`
      : null;

  const cities = useMemo(() => {
    const names = new Set<string>();
    sites.forEach((s) => s.city?.name && names.add(s.city.name));
    return Array.from(names).sort();
  }, [sites]);

  const filtered = useMemo(
    () => (city ? sites.filter((s) => s.city?.name === city) : sites),
    [sites, city]
  );

    const mapPoints = useMemo<MapPoint[]>(() => {
    const pts: MapPoint[] = filtered
      .filter((s) => typeof s.latitude === "number" && typeof s.longitude === "number")
      .map((s) => ({
        id: s.code,
        name: `${s.code} ${s.name || ""}`.trim(),
        lat: s.latitude,
        lng: s.longitude,
        polygon: s.code === selectedMapId ? selectedPolygon : null,  // ← only the selected one
      }));
    mine.forEach((s) =>
      pts.push({ id: `mine:${s.id}`, name: s.name, lat: s.latitude, lng: s.longitude })
    );
    return pts;
  }, [filtered, mine, selectedMapId, selectedPolygon]);

  // map click -> select the corresponding site
  function onMapSelect(id: string) {
    if (id.startsWith("mine:")) {
      const s = mine.find((m) => `mine:${m.id}` === id);
      if (s) chooseMine(s);
    } else {
      const s = sites.find((x) => x.code === id);
      if (s) chooseOfficial(s);
    }
  }


  function chooseOfficial(s: Site) {
    const ref: SiteRef = { type: "existing", code: s.code, name: s.name || s.code, lat: s.latitude, lng: s.longitude };
    dispatch({ type: "setSite", site: ref });
  }
  function chooseMine(s: UserSite) {
    dispatch({ type: "setSite", site: { type: "new", name: s.name, lat: s.latitude, lng: s.longitude } });
  }

  async function removeMine(s: UserSite) {
    if (!confirm(`Delete site "${s.name}"?`)) return;
    await deleteMySite(username, s.id);
    setMine((m) => m.filter((x) => x.id !== s.id));
    // if the deleted site was selected, clear selection
    if (draft.site?.type === "new" && draft.site.name === s.name) {
      dispatch({ type: "setSite", site: null as never });
    }
  }

  const selectedKey = draft.site?.code ?? draft.site?.name ?? null;

  return (
    <div className={styles.siteWrap}>
      <div className={styles.sitePanel}>
        <h2 className={styles.stepTitle}>Where are you assessing?</h2>

        <label className={styles.label}>City</label>
        <select className={styles.select} value={city} onChange={(e) => setCity(e.target.value)}>
          <option value="">All cities</option>
          {cities.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>

        {mine.length > 0 && (
          <>
            <p className={styles.groupLabel}>Your sites</p>
            <ul className={styles.siteList}>
              {mine.map((s) => (
                <li key={s.id} className={styles.siteRowWrap}>
                  <button
                    className={`${styles.siteRow} ${selectedKey === s.name ? styles.siteRowSel : ""}`}
                    onClick={() => chooseMine(s)}
                  >
                    {s.name}
                  </button>
                  <button
                    className={styles.siteDelete}
                    title="Delete site"
                    onClick={() => removeMine(s)}
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}

        <p className={styles.groupLabel}>Monitoring sites</p>
        <ul className={styles.siteList}>
          {filtered.map((s) => (
            <li key={s.code}>
              <button
                className={`${styles.siteRow} ${selectedKey === s.code ? styles.siteRowSel : ""}`}
                onClick={() => chooseOfficial(s)}
              >
                <strong>{s.code}</strong> {s.name || <em className={styles.muted}>(unnamed)</em>}
              </button>
            </li>
          ))}
        </ul>

        <button className={styles.linkBtn} onClick={() => setAdding((v) => !v)}>
          {adding ? "Cancel" : "+ Add a new site"}
        </button>
        {adding && (
          <AddSite
            username={username}
            onAdded={(s) => {
              setMine((m) => [...m, s]);
              chooseMine(s);
              setAdding(false);
            }}
          />
        )}
      </div>

      {/* Mapbox drops in here later; reads selected site coords / polygon */}
      <div className={styles.mapSlot}>
        <SiteMap points={mapPoints} selectedId={selectedMapId} onSelect={onMapSelect} height={380} />
        {draft.site && (
          <p className={styles.muted} style={{ marginTop: "var(--space-2)" }}>
            Selected: <strong>{draft.site.name ?? draft.site.code}</strong>{" "}
            ({draft.site.lat?.toFixed(4)}, {draft.site.lng?.toFixed(4)})
          </p>
        )}
      </div>
    </div>
  );
}

function AddSite({ username, onAdded }: { username: string; onAdded: (s: UserSite) => void }) {
  const [name, setName] = useState("");
  const [coords, setCoords] = useState<LatLng | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function save() {
    if (!name.trim()) { setErr("A site name is required."); return; }
    if (!coords) { setErr("Set a location (map, address, or coordinates)."); return; }
    setBusy(true);
    setErr(null);
    try {
      const s = await createMySite(username, {
        name: name.trim(),
        latitude: coords.lat,
        longitude: coords.lng,
      });
      onAdded(s);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={styles.addSite}>
      <input
        className={styles.input}
        placeholder="Site name"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />

      <LocationPicker value={coords} onChange={setCoords} />

      <button className={styles.primaryBtn} onClick={save} disabled={busy || !name.trim() || !coords}>
        {busy ? "Saving…" : "Save site"}
      </button>

      {err && <p className={styles.error}>{err}</p>}
    </div>
  );
}