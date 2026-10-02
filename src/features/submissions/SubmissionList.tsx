import { useEffect, useState } from "react";
import styles from "./submissions.module.css";
import { listSubmissions } from "../../lib/api";
import { getUsername } from "../../lib/user";
import type { Submission } from "../../lib/types";
import { reviewInfo, submissionTitle, submissionSiteLabel, hasCustomTitle } from "./reviewState";
import KebabMenu from "../../components/KebabMenu";
import { deleteSubmission, patchSubmission } from "../../lib/api";


export default function SubmissionList({ onOpen }: { onOpen: (id: string) => void }) {
  const username = getUsername() ?? "";
  const [items, setItems] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [renaming, setRenaming] = useState<string | null>(null);

  useEffect(() => {
    listSubmissions(username)
      .then(setItems)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [username]);

  if (loading) return <p className={styles.muted}>Loading your submissions…</p>;
  if (items.length === 0)
    return <p className={styles.muted}>No submissions yet. Assess a stream to get started.</p>;

  return (
    <div className={styles.list}>
      {items.map((s) => {
        const info = reviewInfo(s);
        const title = submissionTitle(s);
        const where = submissionSiteLabel(s);
        const named = hasCustomTitle(s);
        const isRenaming = renaming === s.id;

        return (
          <div key={s.id} className={styles.listRow}>
            {isRenaming ? (
              <InlineRename
                initial={named ? title : ""}
                onCancel={() => setRenaming(null)}
                onSave={async (t) => {
                  const updated = await patchSubmission(s.id, { title: t });
                  setItems((prev) => prev.map((x) => (x.id === s.id ? updated : x)));
                  setRenaming(null);
                }}
              />
            ) : (
              <button className={styles.listOpen} onClick={() => onOpen(s.id)}>
                <div className={styles.listMain}>
                  <strong>{title}</strong>
                  <span className={styles.muted}>
                    {where}
                    {named && <> · {new Date(s.created_at).toLocaleDateString()}</>}
                  </span>
                </div>
              </button>
            )}

            <span className={`${styles.pill} ${styles["pill_" + info.state]}`}>{info.label}</span>

            <KebabMenu
              actions={[
                { label: "Rename", onClick: () => setRenaming(s.id) },
                {
                  label: "Delete",
                  danger: true,
                  onClick: async () => {
                    if (!confirm(`Delete "${title}"? This can't be undone.`)) return;
                    await deleteSubmission(s.id);
                    setItems((prev) => prev.filter((x) => x.id !== s.id));
                  },
                },
              ]}
            />
          </div>
        );
      })}
    </div>
  );
}

function InlineRename({
  initial,
  onSave,
  onCancel,
}: {
  initial: string;
  onSave: (t: string) => Promise<void>;
  onCancel: () => void;
}) {
  const [val, setVal] = useState(initial);
  const [busy, setBusy] = useState(false);

  async function save() {
    if (!val.trim()) return;
    setBusy(true);
    try {
      await onSave(val.trim());
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={styles.inlineRename}>
      <input
        className={styles.renameInput}
        value={val}
        autoFocus
        placeholder="Name this assessment"
        onChange={(e) => setVal(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") save();
          if (e.key === "Escape") onCancel();
        }}
      />
      <button className={styles.linkBtn} disabled={busy || !val.trim()} onClick={save}>save</button>
      <button className={styles.linkBtn} onClick={onCancel}>cancel</button>
    </div>
  );
}