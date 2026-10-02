import styles from "../assess.module.css";
import { dataUriBytes, humanMB } from "../../../lib/limits";
import type { AssessDraft } from "../assessState";

type Props = {
  draft: AssessDraft;
  submitting: boolean;
  error: string | null;
  onSubmit: () => void;
};

export default function StepSubmit({ draft, submitting, error, onSubmit }: Props) {
  const photoCount =
    draft.photoMode === "labeled"
      ? Object.keys(draft.media).length
      : draft.unlabeled.length;

  const photoLabel =
    draft.photoMode === "labeled" ? `${photoCount} of 4 (guided)` : `${photoCount} (unlabeled)`;

  // total size for a quick sanity line
  const uris =
    draft.photoMode === "labeled" ? Object.values(draft.media) : draft.unlabeled;
  let bytes = uris.reduce((n, u) => n + dataUriBytes(u), 0);
  if (draft.video) bytes += dataUriBytes(draft.video);

  return (
    <div className={styles.submitWrap}>
      <h2 className={styles.stepTitle}>Ready to submit</h2>
      <ul className={styles.review}>
        <li><span className={styles.muted}>Site</span> {draft.site?.name ?? draft.site?.code ?? "—"}</li>
        <li><span className={styles.muted}>Photos</span> {photoCount > 0 ? photoLabel : "none"}</li>
        <li><span className={styles.muted}>Video</span> {draft.video ? "attached" : "none"}</li>
        <li><span className={styles.muted}>Total size</span> {humanMB(bytes)}</li>
        <li><span className={styles.muted}>Water height</span> {draft.waterHeight || "not provided"}</li>
        <li><span className={styles.muted}>Invasive plants</span> {draft.invasive ?? "not answered"}</li>
      </ul>
      <p className={styles.muted}>
        When you submit, the AI analyzes your photos in the background. You&rsquo;ll review
        and confirm its findings under <strong>My submissions</strong>.
      </p>
      {error && <p className={styles.error}>{error}</p>}
      <button className={styles.primaryBtn} onClick={onSubmit} disabled={submitting || !draft.site || photoCount === 0}>
        {submitting ? "Submitting…" : "Submit assessment"}
      </button>
      {photoCount === 0 && (
        <p className={styles.muted}>Add at least one photo to submit.</p>
      )}
    </div>
  );
}