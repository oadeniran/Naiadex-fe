import { useEffect, useState } from "react";
import styles from "./identify.module.css";
import {
  getObservation,
  addIdentification,
  acceptIdentification,
  addObsComment,
  setObservationLocation
} from "../../lib/api";
import { accepted, confidencePct } from "./obsHelpers";
import type { Observation } from "../../lib/types";
import SiteMap, { type MapPoint } from "../../components/SiteMap";
import LocationPicker from "../../components/LocationPicker";

export default function ObservationDetail({
  id,
  username,
  onBack,
  onUpdated,
}: {
  id: string;
  username: string;
  onBack: () => void;
  onUpdated: (o: Observation) => void;
}) {
  const [obs, setObs] = useState<Observation | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [editingLoc, setEditingLoc] = useState(false);

  useEffect(() => {
    getObservation(id).then(setObs).catch((e) => setErr(String(e)));
  }, [id]);

  function update(o: Observation) {
    setObs(o);
    onUpdated(o);
  }

  if (err) return (
    <div><button className={styles.backBtn} onClick={onBack}>← Back</button><p className={styles.error}>{err}</p></div>
  );
  if (!obs) return <p className={styles.empty}>Loading…</p>;

  const acc = accepted(obs);
  const isOwner = !!username && username === obs.username;
  const aiIdent = obs.identifications?.find((i) => i.source === "ai");
  const onlyAiSoFar = obs.status === "unreviewed" && (obs.identifications?.length ?? 0) <= 1;

  return (
    <div className={styles.detail}>
      <button className={styles.backBtn} onClick={onBack}>← Back to dex</button>

      {obs.image_url && <img src={obs.image_url} alt={acc?.common_name ?? ""} className={styles.detailImg} />}

      <header className={styles.idHeader}>
        <div className={styles.idTitleBlock}>
          <h2 className={styles.detailName}>{acc?.common_name ?? "Unknown"}</h2>
          {acc?.scientific_name && <p className={styles.sciName}>{acc.scientific_name}</p>}
        </div>
        {obs.status === "reviewed" ? <span className={styles.verified}>✓ reviewed</span> : <span className={styles.aiTag}>AI only</span>}
      </header>

      <div className={styles.metaRow}>
        {obs.result.category && <span className={styles.metaChip}>{obs.result.category}</span>}
        {obs.result.is_water_related && <span className={styles.metaChip}>freshwater</span>}
        {acc?.confidence != null && <span className={styles.metaItem}>AI {confidencePct(acc.confidence)}% confident</span>}
        <span className={styles.metaItem}>by {obs.username ?? "anonymous"}</span>
        <span className={styles.metaItem}>{new Date(obs.created_at).toLocaleDateString()}</span>
        {obs.lat != null && obs.lng != null && <span className={styles.metaItem}>{obs.lat.toFixed(3)}, {obs.lng.toFixed(3)}</span>}
      </div>

      {obs.result.notes && (
        <div className={styles.notesBlock}>
          <span className={styles.notesLabel}>Field notes</span>
          <p className={styles.notesText}>{obs.result.notes}</p>
        </div>
      )}

            {obs.lat != null && obs.lng != null ? (
        <div className={styles.detailMap}>
          <SiteMap points={[{ id: obs.id, name: acc?.common_name ?? "Find", lat: obs.lat, lng: obs.lng } as MapPoint]} selectedId={obs.id} height={240} />
          {isOwner && <button className={styles.linkBtn} onClick={() => setEditingLoc(true)}>Change location</button>}
        </div>
      ) : (
        isOwner && <button className={styles.suggestBtn} onClick={() => setEditingLoc(true)}>+ Add location</button>
      )}
      {isOwner && editingLoc && (
        <div className={styles.notesBlock}>
          <LocationPicker
            value={obs.lat != null && obs.lng != null ? { lat: obs.lat, lng: obs.lng } : null}
            onChange={async (v) => update(await setObservationLocation(obs.id, username, v.lat, v.lng))}
          />
          <button className={styles.linkBtn} onClick={() => setEditingLoc(false)}>Done</button>
        </div>
      )}

      <h3 className={styles.sectionTitle}>Identifications</h3>
      <ul className={styles.identList}>
        {obs.identifications?.map((i) => {
          const isAccepted = i.id === obs.accepted_id;
          return (
            <li key={i.id} className={`${styles.identRow} ${isAccepted ? styles.identAccepted : ""}`}>
              <div>
                <strong>{i.common_name}</strong>
                {i.scientific_name && <em className={styles.sciInline}> {i.scientific_name}</em>}
                <div className={styles.identMeta}>
                  {i.source === "ai" ? "AI" : i.by}
                  {i.confidence != null && ` · ${confidencePct(i.confidence)}%`}
                  {isAccepted && " · accepted"}
                </div>
              </div>
              {isOwner && !isAccepted && (
                <button className={styles.acceptBtn} onClick={async () => update(await acceptIdentification(obs.id, i.id, username))}>
                  Accept
                </button>
              )}
            </li>
          );
        })}
      </ul>

      {isOwner && onlyAiSoFar ? (
        <div className={styles.ownerActions}>
          <button className={styles.confirmBtn} onClick={async () => aiIdent && update(await acceptIdentification(obs.id, aiIdent.id, username))}>
            ✓ Confirm this ID
          </button>
          <SuggestId obs={obs} username={username} onUpdated={update} label="Suggest a different ID" />
        </div>
      ) : (
        <SuggestId obs={obs} username={username} onUpdated={update} />
      )}

      <h3 className={styles.sectionTitle}>Comments</h3>
      <ul className={styles.commentList}>
        {(obs.comments ?? []).length === 0 && <li className={styles.empty}>No comments yet.</li>}
        {obs.comments?.map((c) => (
          <li key={c.id} className={styles.comment}>
            <span className={styles.commentBy}>{c.by}</span>
            <span className={styles.commentText}>{c.text}</span>
            <span className={styles.commentTime}>{new Date(c.created_at).toLocaleDateString()}</span>
          </li>
        ))}
      </ul>
      <AddComment obs={obs} username={username} onUpdated={update} />
    </div>
  );
}

function SuggestId({ obs, username, onUpdated, label = "+ Suggest an identification" }: {
  obs: Observation; username: string; onUpdated: (o: Observation) => void; label?: string;
}) {
  const [open, setOpen] = useState(false);
  const [common, setCommon] = useState("");
  const [sci, setSci] = useState("");
  const [busy, setBusy] = useState(false);
  const isOwner = username === obs.username;

  async function submit() {
    if (!common.trim()) return;
    setBusy(true);
    try {
      const updated = await addIdentification(obs.id, username || "anonymous", common.trim(), sci.trim() || null);
      onUpdated(updated);
      setCommon(""); setSci(""); setOpen(false);
    } finally { setBusy(false); }
  }

  if (!open) return <button className={styles.suggestBtn} onClick={() => setOpen(true)}>{label}</button>;
  return (
    <div className={styles.suggestPanel}>
      <input className={styles.input} placeholder="Common name" value={common} onChange={(e) => setCommon(e.target.value)} />
      <input className={styles.input} placeholder="Scientific name (optional)" value={sci} onChange={(e) => setSci(e.target.value)} />
      <p className={styles.hint}>{isOwner ? "As the owner, your suggestion becomes the accepted identification." : "Your suggestion is added for the owner to review."}</p>
      <div className={styles.row}>
        <button className={styles.primarySm} disabled={busy || !common.trim()} onClick={submit}>{busy ? "…" : "Suggest"}</button>
        <button className={styles.linkBtn} onClick={() => setOpen(false)}>Cancel</button>
      </div>
    </div>
  );
}

function AddComment({ obs, username, onUpdated }: { obs: Observation; username: string; onUpdated: (o: Observation) => void }) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!text.trim()) return;
    setBusy(true);
    try {
      onUpdated(await addObsComment(obs.id, username || "anonymous", text.trim()));
      setText("");
    } finally { setBusy(false); }
  }

  return (
    <div className={styles.row}>
      <input className={styles.input} placeholder="Add a comment…" value={text}
        onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && submit()} />
      <button className={styles.primarySm} disabled={busy || !text.trim()} onClick={submit}>{busy ? "…" : "Post"}</button>
    </div>
  );
}