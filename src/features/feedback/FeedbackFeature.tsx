import { useState } from "react";
import styles from "./feedback.module.css";
import { sendFeedback } from "../../lib/api";
import { getUsername } from "../../lib/user";

const CATEGORIES = [
  { id: "idea", label: "💡 Idea" },
  { id: "bug", label: "🐞 Bug" },
  { id: "praise", label: "👏 Praise" },
  { id: "other", label: "💬 Other" },
];

export default function FeedbackFeature() {
  const username = getUsername() ?? "";
  const [category, setCategory] = useState("idea");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!message.trim()) return;
    setBusy(true); setError(null);
    try {
      await sendFeedback(category, message.trim(), username || null);
      setSent(true);
      setMessage("");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  if (sent) {
    return (
      <div className={styles.done}>
        <h2>Thanks for the feedback 🙌</h2>
        <p className={styles.muted}>It helps make Naiadex better.</p>
        <button className={styles.primaryBtn} onClick={() => setSent(false)}>Send more</button>
      </div>
    );
  }

  return (
    <div className={styles.wrap}>
      <h2 className={styles.title}>Share your feedback</h2>
      <p className={styles.muted}>Found a bug, have an idea, or just want to say something? We&rsquo;re listening.</p>

      <div className={styles.cats}>
        {CATEGORIES.map((c) => (
          <button
            key={c.id}
            className={`${styles.cat} ${category === c.id ? styles.catSel : ""}`}
            onClick={() => setCategory(c.id)}
          >
            {c.label}
          </button>
        ))}
      </div>

      <textarea
        className={styles.textarea}
        placeholder="What's on your mind?"
        rows={6}
        value={message}
        onChange={(e) => setMessage(e.target.value)}
      />

      {error && <p className={styles.error}>{error}</p>}

      <button className={styles.primaryBtn} onClick={submit} disabled={busy || !message.trim()}>
        {busy ? "Sending…" : "Send feedback"}
      </button>
    </div>
  );
}