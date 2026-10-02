import styles from "./identify.module.css";
import { accepted } from "./obsHelpers";
import type { Observation } from "../../lib/types";

export default function CompactCard({
  obs,
  highlight,
  showFinder,
  onOpen,
}: {
  obs: Observation;
  highlight?: boolean;
  showFinder?: boolean;
  onOpen: () => void;
}) {
  const acc = accepted(obs);
  const reviewed = obs.status === "reviewed";
  const suggestions = obs.identifications?.filter((i) => i.source === "human").length ?? 0;

  return (
    <button className={`${styles.card} ${highlight ? styles.cardHighlight : ""}`} onClick={onOpen}>
      {obs.image_url && <img src={obs.image_url} alt={acc?.common_name ?? ""} className={styles.cardImg} />}
      <div className={styles.cardHead}>
        <h3 className={styles.name}>{acc?.common_name ?? "Unknown"}</h3>
        {reviewed ? <span className={styles.verified}>✓ reviewed</span> : <span className={styles.aiTag}>AI</span>}
      </div>
      {acc?.scientific_name && <p className={styles.sci}>{acc.scientific_name}</p>}
      <div className={styles.cardMeta}>
        {showFinder && <span className={styles.finder}>by {obs.username ?? "anonymous"}</span>}
        {suggestions > 0 && <span className={styles.finder}>{suggestions} suggestion{suggestions === 1 ? "" : "s"}</span>}
      </div>
    </button>
  );
}