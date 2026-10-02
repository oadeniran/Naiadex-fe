import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import styles from "./explore.module.css";
import { getSubmission, getRubric } from "../../lib/api";
import SiteMap, { type MapPoint } from "../../components/SiteMap";
import { submissionTitle, submissionSiteLabel } from "../submissions/reviewState";
import type { Submission, Question } from "../../lib/types";

export default function ExploreDetail({ id, onBack }: { id: string; onBack: () => void }) {
  const [sub, setSub] = useState<Submission | null>(null);
  const [rubric, setRubric] = useState<Record<string, Question>>({});
  const [error, setError] = useState<string | null>(null);
  const [lightbox, setLightbox] = useState<string | null>(null);

  useEffect(() => {
    getSubmission(id).then(setSub).catch((e) => setError(String(e)));
    getRubric()
      .then((qs) => setRubric(Object.fromEntries(qs.map((q) => [q.key, q]))))
      .catch(() => {});
  }, [id]);

  if (error) return (
    <div><button className={styles.linkBtn} onClick={onBack}>← Explore</button><p className={styles.error}>{error}</p></div>
  );
  if (!sub) return <p className={styles.muted}>Loading…</p>;

  const overall = (sub.overall?.value as string) ?? null;
  const point: MapPoint | null =
    sub.site?.lat != null && sub.site?.lng != null
      ? { id: sub.id, name: submissionSiteLabel(sub), lat: sub.site.lat, lng: sub.site.lng }
      : null;

  const photos = Object.entries(sub.media ?? {}).filter(([k, uri]) => k !== "video" && !!uri);
  const video = sub.media?.video;

  return (
    <div className={styles.detail}>
      <button className={styles.linkBtn} onClick={onBack}>← Explore</button>

      <div className={styles.detailHead}>
        <h2 className={styles.detailTitle}>{submissionTitle(sub)}</h2>
        {overall && <span className={`${styles.badge} ${styles["badge_" + overall.toLowerCase()]}`}>{overall}</span>}
      </div>
      <p className={styles.muted}>{submissionSiteLabel(sub)} · {new Date(sub.created_at).toLocaleDateString()}</p>

      {sub.synthesis && (
        <div className={styles.synthesis}><ReactMarkdown>{sub.synthesis}</ReactMarkdown></div>
      )}

      {point && (
        <div className={styles.mapWrap}>
          <SiteMap points={[point]} selectedId={sub.id} height={280} />
        </div>
      )}

      {photos.length > 0 && (
        <div className={styles.photoRow}>
          {photos.map(([label, uri]) => (
            <figure key={label} className={styles.photo}>
              <button className={styles.photoBtn} onClick={() => setLightbox(uri)}>
                <img src={uri} alt={label} className={styles.photoImg} />
              </button>
              <figcaption className={styles.photoCap}>{label}</figcaption>
            </figure>
          ))}
          {lightbox && (
            <div className={styles.lightbox} onClick={() => setLightbox(null)}>
              <img src={lightbox} alt="" className={styles.lightboxImg} />
              <button className={styles.lightboxClose} onClick={() => setLightbox(null)}>✕</button>
            </div>
          )}
        </div>
      )}

      {video && (
        <video src={video} controls className={styles.detailVideo} />
      )}

      <div className={styles.findings}>
        {Object.entries(sub.answers)
          .filter(([k, a]) => rubric[k] && a.value != null && a.value !== "")
          .map(([k, a]) => (
            <div key={k} className={styles.finding}>
              <span className={styles.findingQ}>{rubric[k].prompt}</span>
              <span className={styles.findingV}>{renderValue(rubric[k], a.value)}</span>
            </div>
          ))}
      </div>
    </div>
  );
}

function renderValue(q: Question, val: unknown): string {
  if (val && typeof val === "object" && !Array.isArray(val)) {
    return Object.entries(val as Record<string, unknown>)
      .map(([side, v]) => `${side}: ${leaf(q, v)}`).join("   ");
  }
  return leaf(q, val);
}
function leaf(q: Question, val: unknown): string {
  if (val == null || val === "") return "—";
  if (q.type === "single" || q.type === "multi") {
    const codes = Array.isArray(val) ? val : [val];
    return codes.map((c) => q.options.find((o) => o.code === c)?.display_name ?? String(c)).join(", ");
  }
  return String(val);
}