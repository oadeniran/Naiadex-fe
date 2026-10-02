import styles from "../assess.module.css";
import type { AssessDraft, Action } from "../assessState";
import type { Feelings } from "../../../lib/types";

type Props = { draft: AssessDraft; dispatch: React.Dispatch<Action> };
const FEELINGS: (keyof Feelings)[] = ["joy", "serenity", "anger", "fear"];

export default function StepHuman({ draft, dispatch }: Props) {
  return (
    <div className={styles.humanWrap}>
      <h2 className={styles.stepTitle}>A few things only you can tell us</h2>

      <div className={styles.field}>
        <label className={styles.label}>Water height (if you measured it)</label>
        <input
          className={styles.input}
          placeholder="e.g. 15 cm — optional"
          value={draft.waterHeight}
          onChange={(e) => dispatch({ type: "setField", field: "waterHeight", value: e.target.value })}
        />
      </div>

      <div className={styles.field}>
        <label className={styles.label}>Any non-native or invasive plants?</label>
        <div className={styles.yesno}>
          {(["YES", "NO", "UNSURE"] as const).map((v) => (
            <button
              key={v}
              className={`${styles.chip} ${draft.invasive === v ? styles.chipSel : ""}`}
              onClick={() => dispatch({ type: "setField", field: "invasive", value: v })}
            >
              {v === "UNSURE" ? "Not sure" : v[0] + v.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
        {draft.invasive === "YES" && (
          <input
            className={styles.input}
            placeholder="Which ones? (if you know)"
            value={draft.invasiveWhich}
            onChange={(e) => dispatch({ type: "setField", field: "invasiveWhich", value: e.target.value })}
          />
        )}
      </div>

      <div className={styles.field}>
        <label className={styles.label}>How did being here make you feel?</label>
        <p className={styles.muted}>Streams can affect how we feel. Drag to rate intensity (0–5).</p>
        {FEELINGS.map((key) => {
          const na = draft.feelings.na.includes(key);
          return (
            <div key={key} className={styles.slider}>
              <div className={styles.sliderHead}>
                <span className={styles.sliderName}>{key[0].toUpperCase() + key.slice(1)}</span>
                <label className={styles.naLabel}>
                  <input type="checkbox" checked={na} onChange={() => dispatch({ type: "toggleFeelingNa", key })} />
                  N/A
                </label>
              </div>
              <input
                type="range"
                min={0}
                max={5}
                disabled={na}
                value={(draft.feelings[key] as number) ?? 3}
                onChange={(e) => dispatch({ type: "setFeeling", key, value: Number(e.target.value) })}
              />
              {!na && <span className={styles.sliderVal}>{(draft.feelings[key] as number) ?? 3}</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}