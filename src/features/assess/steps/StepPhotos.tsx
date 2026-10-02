import { type ChangeEvent, useMemo, useState } from "react";
import styles from "../assess.module.css";
import { fileToDataUri } from "../../../lib/api";
import {
  MAX_TOTAL_BYTES, MAX_VIDEO_BYTES, MAX_UNLABELED_PHOTOS, dataUriBytes, humanMB,
} from "../../../lib/limits";
import type { AssessDraft, Action } from "../assessState";

type Props = { draft: AssessDraft; dispatch: React.Dispatch<Action> };

const PHOTOS: { label: string; title: string; unlocks: string }[] = [
  { label: "upstream", title: "Upstream", unlocks: "channel shape, bed, banks, water flow & clarity" },
  { label: "downstream", title: "Downstream", unlocks: "channel, barriers, pipes & discharges" },
  { label: "context", title: "Surroundings", unlocks: "roads, buildings, impervious margins, construction" },
  { label: "biodiversity", title: "Biodiversity", unlocks: "margin vegetation & interesting species" },
];

function totalBytes(draft: AssessDraft): number {
  let n = 0;
  if (draft.photoMode === "labeled") {
    Object.values(draft.media).forEach((u) => (n += dataUriBytes(u)));
  } else {
    draft.unlabeled.forEach((u) => (n += dataUriBytes(u)));
  }
  if (draft.video) n += dataUriBytes(draft.video);
  return n;
}

export default function StepPhotos({ draft, dispatch }: Props) {
  const used = useMemo(() => totalBytes(draft), [draft]);
  const over = used > MAX_TOTAL_BYTES;

  return (
    <div>
      <h2 className={styles.stepTitle}>Add your photos</h2>

      <div className={styles.modeToggle}>
        <button
          className={`${styles.chip} ${draft.photoMode === "labeled" ? styles.chipSel : ""}`}
          onClick={() => dispatch({ type: "setPhotoMode", mode: "labeled" })}
        >
          Guided (4 views)
        </button>
        <button
          className={`${styles.chip} ${draft.photoMode === "unlabeled" ? styles.chipSel : ""}`}
          onClick={() => dispatch({ type: "setPhotoMode", mode: "unlabeled" })}
        >
          I just have photos
        </button>
      </div>

      {draft.photoMode === "labeled" ? (
        <>
          <p className={styles.muted}>
            Each photo unlocks different checks. Skip any you don&rsquo;t have — anything a photo
            can&rsquo;t show is left for you to answer.
          </p>
          <div className={styles.photoGrid}>
            {PHOTOS.map((p) => (
              <PhotoTile key={p.label} spec={p} uri={draft.media[p.label]} dispatch={dispatch} />
            ))}
          </div>
        </>
      ) : (
        <UnlabeledGrid draft={draft} dispatch={dispatch} />
      )}

      <VideoTile draft={draft} dispatch={dispatch} />

      <div className={`${styles.sizeMeter} ${over ? styles.sizeOver : ""}`}>
        {humanMB(used)} of {humanMB(MAX_TOTAL_BYTES)} used
        {over && <> — remove some files to continue</>}
      </div>
    </div>
  );
}

function PhotoTile({
  spec, uri, dispatch,
}: {
  spec: { label: string; title: string; unlocks: string };
  uri?: string;
  dispatch: React.Dispatch<Action>;
}) {
  const [busy, setBusy] = useState(false);
  async function onPick(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    try {
      dispatch({ type: "setPhoto", label: spec.label, uri: await fileToDataUri(file) });
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className={styles.photoTile}>
      <label className={styles.photoDrop}>
        <input type="file" accept="image/*" capture="environment" className={styles.fileInput} onChange={onPick} />
        {uri ? <img src={uri} alt={spec.title} className={styles.photoThumb} /> : <span className={styles.photoAdd}>{busy ? "…" : "Tap to add"}</span>}
      </label>
      <div className={styles.photoMeta}>
        <strong>{spec.title}</strong>
        <span className={styles.muted}>{spec.unlocks}</span>
        {uri && <button className={styles.linkBtn} onClick={() => dispatch({ type: "clearPhoto", label: spec.label })}>Remove</button>}
      </div>
    </div>
  );
}

function UnlabeledGrid({ draft, dispatch }: Props) {
  const [busy, setBusy] = useState(false);
  const full = draft.unlabeled.length >= MAX_UNLABELED_PHOTOS;

  async function onPick(e: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;
    setBusy(true);
    try {
      const room = MAX_UNLABELED_PHOTOS - draft.unlabeled.length;
      for (const file of files.slice(0, room)) {
        dispatch({ type: "addUnlabeled", uri: await fileToDataUri(file) });
      }
    } finally {
      setBusy(false);
      e.target.value = "";
    }
  }

  return (
    <>
      <p className={styles.muted}>
        Not sure which view is which? Just add up to {MAX_UNLABELED_PHOTOS} photos of the stream and
        its surroundings — the AI will work out what it can from them.
      </p>
      <div className={styles.photoGrid}>
        {draft.unlabeled.map((uri, i) => (
          <div key={i} className={styles.photoTile}>
            <div className={styles.photoDrop}><img src={uri} alt={`Photo ${i + 1}`} className={styles.photoThumb} /></div>
            <div className={styles.photoMeta}>
              <button className={styles.linkBtn} onClick={() => dispatch({ type: "removeUnlabeled", index: i })}>Remove</button>
            </div>
          </div>
        ))}
        {!full && (
          <label className={`${styles.photoTile} ${styles.photoDrop}`} style={{ minHeight: 150, cursor: "pointer" }}>
            <input type="file" accept="image/*" multiple capture="environment" className={styles.fileInput} onChange={onPick} />
            <span className={styles.photoAdd}>{busy ? "…" : `+ Add photo (${draft.unlabeled.length}/${MAX_UNLABELED_PHOTOS})`}</span>
          </label>
        )}
      </div>
    </>
  );
}

function VideoTile({ draft, dispatch }: Props) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function onPick(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setErr(null);
    if (file.size > MAX_VIDEO_BYTES) {
      setErr(`Video is ${humanMB(file.size)} — must be under ${humanMB(MAX_VIDEO_BYTES)}. Use a shorter or lower-res clip.`);
      e.target.value = "";
      return;
    }
    setBusy(true);
    try {
      const reader = new FileReader();
      const uri: string = await new Promise((res, rej) => {
        reader.onload = () => res(reader.result as string);
        reader.onerror = () => rej(new Error("Read failed"));
        reader.readAsDataURL(file);   // video isn't compressed; sent as-is
      });
      dispatch({ type: "setVideo", uri });
    } finally {
      setBusy(false);
      e.target.value = "";
    }
  }

  return (
    <div className={styles.videoBlock}>
      <strong>Short video (optional)</strong>
      <p className={styles.muted}>A 5–10s clip, under {humanMB(MAX_VIDEO_BYTES)}. Stored with your assessment — not analyzed by AI.</p>
      {draft.video ? (
        <div>
          <video src={draft.video} controls className={styles.videoPreview} />
          <button className={styles.linkBtn} onClick={() => dispatch({ type: "setVideo", uri: null })}>Remove video</button>
        </div>
      ) : (
        <label className={styles.videoDrop}>
          <input type="file" accept="video/*" capture="environment" className={styles.fileInput} onChange={onPick} />
          <span className={styles.photoAdd}>{busy ? "Loading…" : "Tap to add a video"}</span>
        </label>
      )}
      {err && <p className={styles.error}>{err}</p>}
    </div>
  );
}