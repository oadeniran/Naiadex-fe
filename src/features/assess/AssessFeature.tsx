import { useEffect, useReducer, useState } from "react";
import styles from "./assess.module.css";
import { reducer, emptyDraft, type AssessDraft } from "./assessState";
import { getUsername } from "../../lib/user";
import { createSubmission } from "../../lib/api";
import type { SubmissionCreate } from "../../lib/types";
import StepSite from "./steps/StepSite";
import StepPhotos from "./steps/StepPhotos";
import StepHuman from "./steps/StepHuman";
import StepSubmit from "./steps/StepSubmit";
import { MAX_TOTAL_BYTES, dataUriBytes, humanMB } from "../../lib/limits";

const DRAFT_KEY = "naiadex_assess_draft";
const STEPS = ["Site", "Photos", "Details", "Submit"];

function loadDraft(): AssessDraft {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (raw) return { ...emptyDraft, ...JSON.parse(raw) };
  } catch {
    /* ignore */
  }
  return emptyDraft;
}

export default function AssessFeature() {
  const [draft, dispatch] = useReducer(reducer, loadDraft());
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [doneId, setDoneId] = useState<string | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    } catch {
      /* quota; ignore */
    }
  }, [draft]);

  async function submit() {
    if (!draft.site) return;
    setSubmitting(true);
    setError(null);
    try {
      const answers: SubmissionCreate["answers"] = {};
      if (draft.invasive) {
        answers["invasive_species"] = { value: draft.invasive, source: "human" };
      }
      if (draft.invasiveWhich.trim()) {
        answers["invasive_which"] = { value: draft.invasiveWhich.trim(), source: "human" };
      }

      // enforce combined cap defensively (the Photos step also shows it)
      const media: Record<string, string> = {};
      if (draft.photoMode === "labeled") {
        Object.entries(draft.media).forEach(([k, v]) => (media[k] = v));
      } else {
        draft.unlabeled.forEach((uri, i) => (media[`photo_${i + 1}`] = uri));
      }
      if (draft.video) media["video"] = draft.video;

      const total = Object.values(media).reduce((n, u) => n + dataUriBytes(u), 0);
      if (total > MAX_TOTAL_BYTES) {
        setError(`Your files total ${humanMB(total)} — please remove some to stay under ${humanMB(MAX_TOTAL_BYTES)}.`);
        setSubmitting(false);
        return;
      }

      const payload: SubmissionCreate & { photo_mode: string } = {
        site: draft.site,
        media,
        answers,
        water_height: draft.waterHeight.trim() || null,
        feelings: draft.feelings,
        photo_mode: draft.photoMode,
      };

      const sub = await createSubmission(payload, getUsername() ?? "");
      localStorage.removeItem(DRAFT_KEY);
      setDoneId(sub.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSubmitting(false);
    }
  }

  if (doneId) {
    return (
      <div className={styles.done}>
        <h2>Assessment submitted</h2>
        <p className={styles.muted}>
          Your photos are being analyzed in the background. Open{" "}
          <strong>My submissions</strong> to watch the results come in — you don&rsquo;t
          need to wait here.
        </p>
        <button
          className={styles.primaryBtn}
          onClick={() => {
            setDoneId(null);
            dispatch({ type: "reset" });
          }}
        >
          Start another
        </button>
      </div>
    );
  }

  return (
    <div className={styles.flow}>
      <ol className={styles.stepper}>
        {STEPS.map((label, i) => (
          <li
            key={label}
            className={`${styles.stepItem} ${i === draft.step ? styles.stepActive : ""} ${
              i < draft.step ? styles.stepDone : ""
            }`}
          >
            <span className={styles.stepDot}>{i + 1}</span>
            <span className={styles.stepLabel}>{label}</span>
          </li>
        ))}
      </ol>

      <div className={styles.stepBody}>
        {draft.step === 0 && <StepSite draft={draft} dispatch={dispatch} />}
        {draft.step === 1 && <StepPhotos draft={draft} dispatch={dispatch} />}
        {draft.step === 2 && <StepHuman draft={draft} dispatch={dispatch} />}
        {draft.step === 3 && (
          <StepSubmit draft={draft} submitting={submitting} error={error} onSubmit={submit} />
        )}
      </div>

      <div className={styles.nav}>
        <button
          className={styles.navBtn}
          disabled={draft.step === 0}
          onClick={() => dispatch({ type: "goto", step: draft.step - 1 })}
        >
          ← Back
        </button>
        {draft.step < 3 && (
          <button
            className={styles.navBtnPrimary}
            disabled={draft.step === 0 && !draft.site}
            onClick={() => dispatch({ type: "goto", step: draft.step + 1 })}
          >
            Next →
          </button>
        )}
      </div>
    </div>
  );
}