import { useEffect, useMemo, useState } from "react";
import styles from "./explore.module.css";
import { getExplore, getRubric } from "../../lib/api";
import { distanceKm } from "../../lib/geo";
import { submissionTitle, submissionSiteLabel } from "../submissions/reviewState";
import ExploreFilters from "./ExploreFilters";
import { applyExploreFilters, emptyExploreFilters, type ExploreFilterState } from "./exploreFilterConfig";
import type { Submission, Question } from "../../lib/types";

export default function ExploreFeed({ onOpen }: { onOpen: (id: string) => void }) {
  const [items, setItems] = useState<Submission[]>([]);
  const [rubric, setRubric] = useState<Record<string, Question>>({});
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<ExploreFilterState>(emptyExploreFilters);
  const [showFilters, setShowFilters] = useState(false); // mobile toggle

  useEffect(() => {
    getExplore()
      .then(setItems)
      .catch(() => {})
      .finally(() => setLoading(false));
    getRubric()
      .then((qs) => setRubric(Object.fromEntries(qs.map((q) => [q.key, q]))))
      .catch(() => {});
  }, []);

  const shown = useMemo(() => applyExploreFilters(items, filters), [items, filters]);

  if (loading) return <p className={styles.muted}>Loading assessments…</p>;

  if (items.length === 0) {
    return (
      <div className={styles.empty}>
        <h3>No shared assessments yet</h3>
        <p className={styles.muted}>
          When people finalize their stream assessments, they appear here to explore. Be the
          first — assess a stream and finalize it.
        </p>
      </div>
    );
  }

  return (
    <div className={styles.exploreLayout}>
      <button className={styles.filterToggleBtn} onClick={() => setShowFilters((v) => !v)}>
        {showFilters ? "Hide filters" : "Filters"}
      </button>

      <aside className={`${styles.sidebar} ${showFilters ? styles.sidebarOpen : ""}`}>
        <ExploreFilters rubric={rubric} state={filters} setState={setFilters} />
      </aside>

      <div className={styles.feedMain}>
        <p className={styles.resultCount}>
          {shown.length} of {items.length} assessments
        </p>
        {shown.length === 0 ? (
          <p className={styles.muted}>No assessments match your filters.</p>
        ) : (
          <div className={styles.cards}>
            {shown.map((s) => (
              <ExploreCard
                key={s.id}
                sub={s}
                distance={
                  filters.near && s.site?.lat != null && s.site?.lng != null
                    ? distanceKm(filters.near, { lat: s.site.lat, lng: s.site.lng })
                    : null
                }
                onOpen={() => onOpen(s.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ExploreCard({
  sub,
  distance,
  onOpen,
}: {
  sub: Submission;
  distance: number | null;
  onOpen: () => void;
}) {
  const overall = (sub.overall?.value as string) ?? null;
  const snippet = sub.synthesis
    ? sub.synthesis.replace(/[#*_`>]/g, "").slice(0, 180).trim() + (sub.synthesis.length > 180 ? "…" : "")
    : "No summary available.";

  return (
    <button className={styles.card} onClick={onOpen}>
      <div className={styles.cardHead}>
        <strong className={styles.cardTitle}>{submissionTitle(sub)}</strong>
        {overall && <span className={`${styles.badge} ${styles["badge_" + overall.toLowerCase()]}`}>{overall}</span>}
      </div>
      <span className={styles.cardSite}>
        {submissionSiteLabel(sub)}
        {distance != null && <> · {distance < 1 ? `${Math.round(distance * 1000)} m` : `${distance.toFixed(1)} km`} away</>}
      </span>
      <p className={styles.cardSnippet}>{snippet}</p>
    </button>
  );
}