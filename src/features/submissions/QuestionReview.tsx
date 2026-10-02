import styles from "./submissions.module.css";
import type { Question, AnswerRecord } from "../../lib/types";

type Value = unknown; // code | code[] | "YES"/"NO" | string | {L,R}

export type ReviewValue = { value: Value };

export default function QuestionReview({
  question,
  answer,
  value,
  onChange,
}: {
  question?: Question;
  answer: AnswerRecord;
  value: Value;
  onChange: (v: Value) => void;
}) {
  if (!question) {
    // question not in rubric (e.g. human-only invasive_which) — show raw
    return (
      <div className={styles.reviewRow}>
        <span className={styles.qPrompt}>{answer ? String(answer.value ?? "—") : "—"}</span>
      </div>
    );
  }

  const flagged = answer?.needs_human;

  return (
    <article className={`${styles.reviewRow} ${flagged ? styles.qNeedsHuman : ""}`}>
      <div className={styles.qHead}>
        <span className={styles.qPrompt}>{question.prompt}</span>
        {answer?.source === "human" && <span className={styles.confirmed}>✓ confirmed</span>}
      </div>

      {/* the control */}
      {question.side_split ? (
        <SideSplit question={question} value={value} onChange={onChange} />
      ) : question.type === "yesno" ? (
        <YesNo question={question} value={value} onChange={onChange} />
      ) : question.type === "value" ? (
        <input
          className={styles.input}
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Your answer"
        />
      ) : (
        <OptionPicker question={question} multi={question.type === "multi"} value={value} onChange={onChange} />
      )}

      {/* AI provenance */}
      {answer?.ai_suggestion != null && (
        <p className={styles.aiNote}>
          AI suggested: <strong>{describe(question, answer.ai_suggestion)}</strong>
          {answer.ai_confidence != null && <> ({Math.round(answer.ai_confidence * 100)}%)</>}
          {answer.ai_reason && <> — {answer.ai_reason}</>}
        </p>
      )}
    </article>
  );
}

function ExampleStrip({ question }: { question: Question }) {
  if (question.example_images.length === 0) return null;
  return (
    <div className={styles.exampleStrip}>
      {question.example_images.map((ex, i) => (
        <figure key={i} className={styles.example}>
          <img src={ex.image} alt={ex.label} className={styles.exampleImg} />
          <figcaption className={styles.exampleCap}>{ex.label}</figcaption>
        </figure>
      ))}
    </div>
  );
}

function OptionPicker({
  question,
  multi,
  value,
  onChange,
}: {
  question: Question;
  multi: boolean;
  value: Value;
  onChange: (v: Value) => void;
}) {
  const selected: string[] = multi
    ? Array.isArray(value) ? (value as string[]) : []
    : value != null ? [String(value)] : [];

  function toggle(code: string) {
    if (multi) {
      onChange(selected.includes(code) ? selected.filter((c) => c !== code) : [...selected, code]);
    } else {
      onChange(code);
    }
  }

  return (
    <div className={styles.optGrid}>
      {question.options.map((o) => (
        <button
          key={o.code}
          className={`${styles.optChip} ${selected.includes(o.code) ? styles.optSel : ""}`}
          onClick={() => toggle(o.code)}
        >
          {o.images[0] && <img src={o.images[0].image} alt="" className={styles.optImg} />}
          <span>{o.display_name}</span>
        </button>
      ))}
    </div>
  );
}

function YesNo({
  question,
  value,
  onChange,
}: {
  question: Question;
  value: Value;
  onChange: (v: Value) => void;
}) {
  return (
    <div>
      <ExampleStrip question={question} />
      <div className={styles.yesno}>
        {["YES", "NO"].map((v) => (
          <button
            key={v}
            className={`${styles.chip} ${value === v ? styles.chipSel : ""}`}
            onClick={() => onChange(v)}
          >
            {v[0] + v.slice(1).toLowerCase()}
          </button>
        ))}
      </div>
    </div>
  );
}

function SideSplit({
  question,
  value,
  onChange,
}: {
  question: Question;
  value: Value;
  onChange: (v: Value) => void;
}) {
  const v = (value && typeof value === "object" ? value : {}) as { L?: unknown; R?: unknown };
  const set = (side: "L" | "R", sv: unknown) => onChange({ ...v, [side]: sv });

  const Control = ({ side }: { side: "L" | "R" }) => {
    const cur = v[side];
    if (question.type === "single") {
      return (
        <div className={styles.optGrid}>
          {question.options.map((o) => (
            <button
              key={o.code}
              className={`${styles.optChip} ${cur === o.code ? styles.optSel : ""}`}
              onClick={() => set(side, o.code)}
            >
              {o.images[0] && <img src={o.images[0].image} alt="" className={styles.optImg} />}
              <span>{o.display_name}</span>
            </button>
          ))}
        </div>
      );
    }
    // yesno side_split
    return (
      <div className={styles.yesno}>
        {["YES", "NO"].map((yn) => (
          <button
            key={yn}
            className={`${styles.chip} ${cur === yn ? styles.chipSel : ""}`}
            onClick={() => set(side, yn)}
          >
            {yn[0] + yn.slice(1).toLowerCase()}
          </button>
        ))}
      </div>
    );
  };

  return (
    <div>
      {/* Only show the example strip for yes/no side_splits (impervious, vegetation).
          Single-select side_splits like vegetation_type already carry per-option
          thumbnails inside each Control, so a strip on top would be redundant. */}
      {question.type === "yesno" && <ExampleStrip question={question} />}
      <div className={styles.sideWrap}>
        <div>
          <span className={styles.sideLabel}>Left bank</span>
          <Control side="L" />
        </div>
        <div>
          <span className={styles.sideLabel}>Right bank</span>
          <Control side="R" />
        </div>
      </div>
    </div>
  );
}

function describe(question: Question, val: unknown): string {
  if (val == null) return "—";
  if (question.type === "single" || question.type === "multi") {
    const codes = Array.isArray(val) ? val : [val];
    return codes.map((c) => question.options.find((o) => o.code === c)?.display_name ?? String(c)).join(", ");
  }
  return String(val);
}