import { useCallback, useEffect, useMemo, useState } from "react";
import styles from "./submissions.module.css";
import { getSubmission, getRubric } from "../../lib/api";
import { usePolling } from "../../hooks/usePolling";
import type { Submission, Question } from "../../lib/types";
import { reviewInfo, submissionTitle, submissionSiteLabel, hasCustomTitle } from "./reviewState";
import { resumeSubmission } from "../../lib/api";
import { patchSubmission } from "../../lib/api";
import QuestionReview from "./QuestionReview";
import ReactMarkdown from "react-markdown";

export default function SubmissionDetail({ id, onBack }: { id: string; onBack: () => void }) {
  const [sub, setSub] = useState<Submission | null>(null);
  const [resuming, setResuming] = useState(false);
  const [rubric, setRubric] = useState<Question[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [overall, setOverall] = useState<string | null>(null);
  const [finalizing, setFinalizing] = useState(false);

  useEffect(() => {
    getRubric().then(setRubric).catch(() => {});
  }, []);

  useEffect(() => {
    if (!sub || sub.status === "finalized") return;
    const seed: Record<string, unknown> = {};
    Object.entries(sub.answers).forEach(([k, a]) => { seed[k] = a.value; });
    setAnswers(seed);
    setOverall((sub.overall?.value as string) ?? null);
  }, [sub?.id, sub?.status]);

  const refresh = useCallback(() => {
    getSubmission(id).then(setSub).catch((e) => setError(String(e)));
  }, [id]);

  async function runWithUsable() {
    setResuming(true);
    try {
      await resumeSubmission(id);
      refresh(); // status flips to processing; polling resumes
    } finally {
      setResuming(false);
    }
  }

  async function finalize() {
    if (!sub) return;
    const unresolved = Object.values(sub.answers).filter(
      (a) => a.source === "ai" && a.needs_human
    ).length;
    if (unresolved > 0 && !confirm(`${unresolved} item(s) still need your input. Finalize anyway?`)) return;
    if (!overall && !confirm("No overall rating chosen. Finalize anyway?")) return;

    setFinalizing(true);
    try {
      const patch = {
        answers: Object.fromEntries(Object.entries(answers).map(([k, v]) => [k, { value: v }])),
        overall: overall ? { value: overall, ai_suggested: (sub.overall?.ai_suggested as string) ?? null } : undefined,
        finalize: true,
      };
      const updated = await patchSubmission(id, patch);
      setSub(updated);
    } finally {
      setFinalizing(false);
    }
  }

  // poll only while still processing
  const processing = sub?.status === "processing";
  usePolling(refresh, processing || sub === null, 2500);

  const byKey = useMemo(() => {
    const m: Record<string, Question> = {};
    rubric.forEach((q) => (m[q.key] = q));
    return m;
  }, [rubric]);

  if (error) return <ErrorBack error={error} onBack={onBack} />;
  if (!sub) return <p className={styles.muted}>Loading…</p>;

  // order questions by the rubric's order, fall back to answer keys
  const ordered = rubric.length
    ? rubric.filter((q) => sub.answers[q.key]).map((q) => q.key)
    : Object.keys(sub.answers);

  return (
    <div className={styles.detail}>
      {(() => {
        const info = reviewInfo(sub);
        return (
          <>
            <div className={styles.detailHead}>
              <button className={styles.linkBtn} onClick={onBack}>← All submissions</button>
              <span className={`${styles.pill} ${styles["pill_" + info.state]}`}>{info.label}</span>
            </div>

            <EditableTitle
              current={submissionTitle(sub)}
              hasCustom={hasCustomTitle(sub)}
              onSave={async (t) => {
                const updated = await patchSubmission(id, { title: t });
                setSub(updated);
              }}
            />
            <p className={styles.siteMeta}>
              {submissionSiteLabel(sub)}
              {sub.site?.lat != null && sub.site?.lng != null && (
                <> · {sub.site.lat.toFixed(4)}, {sub.site.lng.toFixed(4)}</>
              )}
              {" · "}
              {new Date(sub.created_at).toLocaleString()}
            </p>

            {info.state === "processing" && (
              <p className={styles.muted}>
                Results appear as the AI works through your photos — this refreshes automatically.
              </p>
            )}
            {info.state === "no_findings" && (
              <p className={styles.banner}>
                None of the questions could be assessed from these photos. They may not show a
                stream, or may be unclear. You can retake your photos and submit a new assessment.
              </p>
            )}
            {info.state === "needs_retake" && (
              <p className={styles.banner}>
                {sub.reason ?? "None of your photos could be used."} Please retake them and submit a
                new assessment.
              </p>
            )}
            {info.state === "needs_photo_review" && sub.gate && (
              <div className={styles.gatePanel}>
                <p className={styles.gateTitle}>Some photos couldn&rsquo;t be used</p>
                <ul className={styles.gateList}>
                  {Object.entries(sub.gate).map(([label, v]) => (
                    <li key={label} className={v.ok ? styles.gateOk : styles.gateBad}>
                      <strong>{label}</strong>: {v.ok ? "usable" : `not usable — ${v.reason}`}
                    </li>
                  ))}
                </ul>
                <div className={styles.gateActions}>
                  <button className={styles.primaryBtn} onClick={runWithUsable} disabled={resuming}>
                    {resuming ? "Starting…" : "Run with usable photos"}
                  </button>
                  <button className={styles.linkBtn} onClick={onBack}>Retake (new assessment)</button>
                </div>
              </div>
            )}
          </>
        );
      })()}

      {sub.status === "processing" ? (
        <div className={styles.questions}>
          {ordered.map((key) => (
            <QuestionRow key={key} question={byKey[key]} keyName={key} answer={sub.answers[key]} />
          ))}
        </div>
      ) : sub.status === "finalized" ? (
        <FinalizedSummary sub={sub} rubric={byKey} ordered={ordered} />
      ) : sub.status === "needs_photo_review" || sub.status === "needs_retake" ? (
        // gate panels above already explain these; show read-only findings so far
        <div className={styles.questions}>
          {ordered.map((key) => (
            <QuestionRow key={key} question={byKey[key]} keyName={key} answer={sub.answers[key]} />
          ))}
        </div>
      ) : (
        <>
          <div className={styles.questions}>
            {ordered.map((key) => (
              <QuestionReview
                key={key}
                question={byKey[key]}
                answer={sub.answers[key]}
                value={answers[key]}
                onChange={(v) => setAnswers((prev) => ({ ...prev, [key]: v }))}
              />
            ))}
          </div>

          <div className={styles.overallBox}>
            <span className={styles.qPrompt}>Overall ecosystem health</span>
            {sub.overall?.ai_suggested != null && (
              <p className={styles.aiNote}>AI suggested: <strong>{String(sub.overall.ai_suggested)}</strong></p>
            )}
            <div className={styles.yesno}>
              {["GOOD", "MODERATE", "POOR"].map((v) => (
                <button key={v} className={`${styles.chip} ${overall === v ? styles.chipSel : ""}`} onClick={() => setOverall(v)}>
                  {v[0] + v.slice(1).toLowerCase()}
                </button>
              ))}
            </div>
          </div>

          <div className={styles.finalizeBar}>
            <button className={styles.primaryBtn} onClick={finalize} disabled={finalizing}>
              {finalizing ? "Finalizing…" : "Finalize assessment"}
            </button>
            <span className={styles.muted}>Finalizing makes this visible on Explore.</span>
          </div>
        </>
      )}
    </div>
  );
}

function QuestionRow({
  question,
  keyName,
  answer,
}: {
  question?: Question;
  keyName: string;
  answer: Submission["answers"][string];
}) {
  const prompt = question?.prompt ?? keyName;
  const isAi = answer.source === "ai";
  const pending = isAi && answer.ai_status === "pending";
  const failed = isAi && answer.ai_status === "failed";

  return (
    <article className={`${styles.qRow} ${answer.needs_human ? styles.qNeedsHuman : ""}`}>
      <div className={styles.qHead}>
        <span className={styles.qPrompt}>{prompt}</span>
        {pending && <span className={styles.spinner}>analyzing…</span>}
      </div>

      {pending ? (
        <div className={styles.skeleton} />
      ) : (
        <>
          <div className={styles.qValue}>{renderValue(question, answer.value)}</div>
          {isAi && answer.ai_confidence != null && (
            <div className={styles.confWrap}>
              <div className={styles.confBar}>
                <div
                  className={styles.confFill}
                  style={{ width: `${Math.round(answer.ai_confidence * 100)}%` }}
                />
              </div>
              <span className={styles.confLabel}>{Math.round(answer.ai_confidence * 100)}%</span>
            </div>
          )}
          {answer.ai_reason && <p className={styles.qReason}>{answer.ai_reason}</p>}
          {answer.needs_human && (
            <p className={styles.flag}>⚑ Needs your review — the photos couldn&rsquo;t settle this.</p>
          )}
          {failed && <p className={styles.flag}>Analysis failed for this item.</p>}
        </>
      )}
    </article>
  );
}

function renderValue(question: Question | undefined, value: unknown): string {
  if (value == null || value === "") return "—";
  if (question && (question.type === "single" || question.type === "multi")) {
    const codes = Array.isArray(value) ? value : [value];
    const labels = codes.map((c) => {
      const opt = question.options.find((o) => o.code === c);
      return opt ? opt.display_name : String(c);
    });
    return labels.join(", ");
  }
  return String(value);
}

function ErrorBack({ error, onBack }: { error: string; onBack: () => void }) {
  return (
    <div className={styles.detail}>
      <button className={styles.linkBtn} onClick={onBack}>← All submissions</button>
      <p className={styles.error}>{error}</p>
    </div>
  );
}

function EditableTitle({
  current,
  hasCustom,
  onSave,
}: {
  current: string;
  hasCustom: boolean;
  onSave: (title: string) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(current);
  const [busy, setBusy] = useState(false);

  if (!editing) {
    return (
      <div className={styles.titleRow}>
        <h2 className={styles.title}>{current}</h2>
        <button className={styles.linkBtn} onClick={() => { setVal(hasCustom ? current : ""); setEditing(true); }}>
          rename
        </button>
      </div>
    );
  }
  return (
    <div className={styles.titleRow}>
      <input
        className={styles.titleInput}
        value={val}
        autoFocus
        placeholder="Name this assessment"
        onChange={(e) => setVal(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && val.trim() && save()}
      />
      <button className={styles.linkBtn} disabled={busy || !val.trim()} onClick={save}>save</button>
      <button className={styles.linkBtn} onClick={() => setEditing(false)}>cancel</button>
    </div>
  );

  async function save() {
    setBusy(true);
    try {
      await onSave(val.trim());
      setEditing(false);
    } finally {
      setBusy(false);
    }
  }
}

function FinalizedSummary({
  sub,
  rubric,
  ordered,
}: {
  sub: Submission;
  rubric: Record<string, Question>;
  ordered: string[];
}) {
  return (
    <div>
      {sub.synthesis && (
        <div className={styles.synthesis}>
          <ReactMarkdown>{sub.synthesis}</ReactMarkdown>
        </div>
      )}

      {sub.overall?.value != null && (
        <div className={styles.overallBox}>
          <span className={styles.qPrompt}>Overall: <strong>{String(sub.overall.value)}</strong></span>
        </div>
      )}
      
      <div className={styles.questions}>
        {ordered.map((k) => {
          const a = sub.answers[k];
          const q = rubric[k];
          if (!a || !q) return null;
          const changed =
            a.source === "human" && a.ai_suggestion != null &&
            JSON.stringify(a.ai_suggestion) !== JSON.stringify(a.value);
          return (
            <div key={k} className={styles.reviewRow}>
              <span className={styles.qPrompt}>{q.prompt}</span>
              <span className={styles.qValue}>{renderFinal(q, a.value)}</span>
              {changed && <p className={styles.aiNote}>Changed from AI: {renderFinal(q, a.ai_suggestion)}</p>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function renderFinal(q: Question, val: unknown): string {
  if (val && typeof val === "object" && !Array.isArray(val)) {
    const o = val as Record<string, unknown>;
    return Object.entries(o).map(([side, v]) => `${side}: ${renderValue(q, v)}`).join("   ");
  }
  return renderValue(q, val);
}