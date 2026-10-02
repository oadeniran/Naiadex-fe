import { useState } from "react";
import SiteMap, { type MapPoint } from "../../components/SiteMap";
import styles from "./identify.module.css";
import { accepted } from "./obsHelpers";
import type { Observation } from "../../lib/types";

export default function ObsMap({
  items,
  onOpen,
}: {
  items: Observation[];
  onOpen: (id: string) => void;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const located = items.filter((o) => typeof o.lat === "number" && typeof o.lng === "number");
  const missing = items.length - located.length;

  const points: MapPoint[] = located.map((o) => ({
    id: o.id,
    name: accepted(o)?.common_name ?? "Unknown",
    lat: o.lat as number,
    lng: o.lng as number,
  }));

  // one tap selects (fly-to); a second tap on the same one opens detail
  function tap(id: string) {
    if (selectedId === id) onOpen(id);
    else setSelectedId(id);
  }

  if (located.length === 0) {
    return (
      <p className={styles.empty}>
        No finds with a location to map{missing > 0 ? ` (${missing} without coordinates)` : ""}.
      </p>
    );
  }

  return (
    <div className={styles.mapLayout}>
      <ul className={styles.mapList}>
        {located.map((o) => {
          const acc = accepted(o);
          const sel = selectedId === o.id;
          return (
            <li key={o.id}>
              <button className={`${styles.mapRow} ${sel ? styles.mapRowSel : ""}`} onClick={() => tap(o.id)}>
                {o.image_url && <img src={o.image_url} alt="" className={styles.mapThumb} />}
                <div className={styles.mapRowBody}>
                  <strong className={styles.mapRowName}>{acc?.common_name ?? "Unknown"}</strong>
                  {acc?.scientific_name && <em className={styles.mapRowSci}>{acc.scientific_name}</em>}
                  <span className={styles.mapRowMeta}>
                    {o.status === "reviewed" ? "✓ reviewed" : "AI"}
                    {sel && " · tap again to open"}
                  </span>
                </div>
                {sel && <span className={styles.mapOpen} onClick={(e) => { e.stopPropagation(); onOpen(o.id); }}>Open →</span>}
              </button>
            </li>
          );
        })}
      </ul>

      <div className={styles.mapPane}>
        <SiteMap points={points} selectedId={selectedId} onSelect={tap} height={460} />
        {missing > 0 && (
          <p className={styles.mapNote}>{missing} find{missing === 1 ? "" : "s"} not shown (no location recorded).</p>
        )}
      </div>
    </div>
  );
}