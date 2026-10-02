import { getUsername } from "./user";
import { getAdminToken } from "./admin";
import type {
  Observation,
  Question,
  Site,
  UserSite,
  Submission,
  SubmissionCreate,
  SubmissionReviewPatch,
} from "./types";


const API_BASE = import.meta.env.VITE_API_BASE ?? "http://localhost:8000";

export async function claimUsername(
  username: string,
  token: string | null
): Promise<{ username: string; token: string }> {
  const res = await fetch(`${API_BASE}/api/users/claim`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, token }),
  });
  if (!res.ok) throw new Error(await errorMessage(res));
  return res.json();
}

async function errorMessage(res: Response): Promise<string> {
  try {
    const data = await res.json();
    if (data?.detail) {
      return typeof data.detail === "string" ? data.detail : JSON.stringify(data.detail);
    }
  } catch {
    /* ignore */
  }
  return `Request failed: ${res.status}`;
}

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) throw new Error(await errorMessage(res));
  return res.json() as Promise<T>;
}

// ---- image helpers ----
export async function compressImage(file: File, maxDim = 1024, quality = 0.8): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("Compression failed"))),
      "image/jpeg",
      quality
    )
  );
}

export async function fileToDataUri(file: File): Promise<string> {
  const blob = await compressImage(file);
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Read failed"));
    reader.readAsDataURL(blob);
  });
}

// ---- identify (Phase 1) ----
export async function identify(
  file: File,
  coords?: { lat: number; lng: number }
): Promise<Observation> {
  const compressed = await compressImage(file);
  const form = new FormData();
  form.append("image", compressed, "photo.jpg");
  form.append("username", getUsername() ?? "");
  if (coords) {
    form.append("lat", String(coords.lat));
    form.append("lng", String(coords.lng));
  }
  return json<Observation>(await fetch(`${API_BASE}/api/identify`, { method: "POST", body: form }));
}

export async function getObservations(username?: string): Promise<Observation[]> {
  const q = username ? `?username=${encodeURIComponent(username)}` : "";
  return json<Observation[]>(await fetch(`${API_BASE}/api/observations${q}`));
}

export async function getAllObservations(): Promise<Observation[]> {
  return json<Observation[]>(await fetch(`${API_BASE}/api/observations/all`));
}

// ---- rubric ----
export async function getRubric(): Promise<Question[]> {
  return json<Question[]>(await fetch(`${API_BASE}/api/rubric`));
}

// ---- sites ----
export async function getSites(): Promise<Site[]> {
  return json<Site[]>(await fetch(`${API_BASE}/api/sites`));
}

export async function getMySites(username: string): Promise<UserSite[]> {
  return json<UserSite[]>(
    await fetch(`${API_BASE}/api/sites/mine?username=${encodeURIComponent(username)}`)
  );
}

export async function createMySite(
  username: string,
  site: { name: string; latitude: number; longitude: number }
): Promise<UserSite> {
  return json<UserSite>(
    await fetch(`${API_BASE}/api/sites/mine?username=${encodeURIComponent(username)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(site),
    })
  );
}

// ---- submissions ----
export async function createSubmission(
  payload: SubmissionCreate,
  username: string
): Promise<Submission> {
  return json<Submission>(
    await fetch(`${API_BASE}/api/submissions?username=${encodeURIComponent(username)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
  );
}

export async function getSubmission(id: string): Promise<Submission> {
  return json<Submission>(await fetch(`${API_BASE}/api/submissions/${id}`));
}

export async function listSubmissions(username: string): Promise<Submission[]> {
  return json<Submission[]>(
    await fetch(`${API_BASE}/api/submissions?username=${encodeURIComponent(username)}`)
  );
}

export async function resumeSubmission(id: string): Promise<Submission> {
  return json<Submission>(await fetch(`${API_BASE}/api/submissions/${id}/resume`, { method: "POST" }));
}

// ---- admin ----
function adminHeaders(extra: Record<string, string> = {}): Record<string, string> {
  const token = getAdminToken();
  return { ...extra, ...(token ? { "X-Admin-Token": token } : {}) };
}

export async function adminGetRubric(): Promise<Question[]> {
  return json<Question[]>(
    await fetch(`${API_BASE}/api/admin/rubric`, { headers: adminHeaders() })
  );
}

export async function adminPatchQuestion(
  key: string,
  patch: Partial<Question>
): Promise<Question> {
  return json<Question>(
    await fetch(`${API_BASE}/api/admin/rubric/${key}`, {
      method: "PATCH",
      headers: adminHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify(patch),
    })
  );
}

export async function adminSetOptionImage(
  key: string,
  code: string,
  file: File
): Promise<{ updated: string }> {
  const form = new FormData();
  form.append("image", await compressImage(file), "ref.jpg");
  return json<{ updated: string }>(
    await fetch(`${API_BASE}/api/admin/rubric/${key}/options/${code}/image`, {
      method: "PUT",
      headers: adminHeaders(), // no Content-Type; browser sets multipart boundary
      body: form,
    })
  );
}

export async function adminGetSites(): Promise<Site[]> {
  return json<Site[]>(await fetch(`${API_BASE}/api/admin/sites`, { headers: adminHeaders() }));
}

export async function adminUpsertSite(code: string, site: Site): Promise<Site> {
  return json<Site>(
    await fetch(`${API_BASE}/api/admin/sites/${code}`, {
      method: "PUT",
      headers: adminHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify(site),
    })
  );
}

export async function patchSubmission(id: string, patch: SubmissionReviewPatch) {
  return json<import("./types").Submission>(
    await fetch(`${API_BASE}/api/submissions/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    })
  );
}

export async function deleteSubmission(id: string): Promise<{ deleted: string }> {
  return json<{ deleted: string }>(
    await fetch(`${API_BASE}/api/submissions/${id}`, { method: "DELETE" })
  );
}

export async function getExplore(): Promise<import("./types").Submission[]> {
  return json<import("./types").Submission[]>(await fetch(`${API_BASE}/api/explore`));
}

export async function deleteMySite(username: string, siteId: string): Promise<{ deleted: string }> {
  return json<{ deleted: string }>(
    await fetch(`${API_BASE}/api/sites/mine/${siteId}?username=${encodeURIComponent(username)}`, {
      method: "DELETE",
    })
  );
}

export async function getSite(code: string): Promise<Site> {
  return json<Site>(await fetch(`${API_BASE}/api/sites/${encodeURIComponent(code)}`));
}

export async function reviewObservation(
  id: string,
  review: { common_name?: string | null; scientific_name?: string | null; publish?: boolean }
): Promise<import("./types").Observation> {
  return json<import("./types").Observation>(
    await fetch(`${API_BASE}/api/observations/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(review),
    })
  );
}

export async function addIdentification(
  obsId: string, by: string, common_name: string, scientific_name?: string | null
) {
  return json<import("./types").Observation>(
    await fetch(`${API_BASE}/api/observations/${obsId}/identifications`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ by, common_name, scientific_name }),
    })
  );
}

export async function acceptIdentification(obsId: string, identId: string, by: string) {
  return json<import("./types").Observation>(
    await fetch(`${API_BASE}/api/observations/${obsId}/accept?ident_id=${encodeURIComponent(identId)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ by }),
    })
  );
}

export async function addObsComment(obsId: string, by: string, text: string) {
  return json<import("./types").Observation>(
    await fetch(`${API_BASE}/api/observations/${obsId}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ by, text }),
    })
  );
}

export async function getObservation(id: string): Promise<import("./types").Observation> {
  return json<import("./types").Observation>(
    await fetch(`${API_BASE}/api/observations/${id}`)
  );
}

export async function setObservationLocation(id: string, by: string, lat: number, lng: number) {
  return json<import("./types").Observation>(
    await fetch(`${API_BASE}/api/observations/${id}/location`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lat, lng, by }),
    })
  );
}

export async function sendFeedback(category: string, message: string, username: string | null) {
  return json<unknown>(
    await fetch(`${API_BASE}/api/feedback`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ category, message, username }),
    })
  );
}