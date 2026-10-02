import { useState } from "react";
import { setUsername } from "../lib/user";


import styles from "./login.module.css";

export default function Login({ onLogin }: { onLogin: (name: string) => void }) {
  const [name, setName] = useState("");
  const [error] = useState<string | null>(null);
  const [busy] = useState(false);
  const trimmed = name.trim();

    function submit() {
    if (!trimmed) return;
    setUsername(trimmed);
    onLogin(trimmed);
  }

  return (
    <div className={styles.screen}>
      <div className={styles.card}>
        <h1 className={styles.title}>Naiadex</h1>
        <p className={styles.sub}>A living dex of urban stream life</p>
        <label className={styles.label} htmlFor="username">Pick a username to start</label>
        <input
          id="username"
          className={styles.input}
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder="e.g. rosa"
          autoFocus
        />
        <button className={styles.btn} onClick={submit} disabled={!trimmed || busy}>
          {busy ? "..." : "Enter"}
        </button>
        {error && <p className={styles.hint} style={{ color: "var(--err)" }}>{error}</p>}
        <p className={styles.hint}>Your finds are saved under this name for the demo.</p>
      </div>
    </div>
  );
}