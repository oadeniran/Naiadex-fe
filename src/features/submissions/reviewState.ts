import type { Submission } from "../../lib/types";

export type ReviewState =
  | "needs_retake"
  | "needs_photo_review"
  | "processing"
  | "complete"        // done, nothing flagged
  | "needs_review"    // done, some items flagged
  | "no_findings"     // done, but (nearly) everything flagged — unusable
  | "partial"         // some AI items failed
  | "failed";

export type ReviewInfo = {
  state: ReviewState;
  label: string;
  needsReview: number;   // count of AI questions flagged needs_human
  aiTotal: number;       // count of AI questions
  doneCount: number;     // AI questions resolved (done or failed)
};

/** AI-owned questions are the ones the gate/analysis actually judged. */
function aiAnswers(sub: Submission) {
  return Object.values(sub.answers).filter((a) => a.source === "ai");
}

export function reviewInfo(sub: Submission): ReviewInfo {
  const ai = aiAnswers(sub);
  const aiTotal = ai.length;
  const needsReview = ai.filter((a) => a.needs_human).length;
  const doneCount = ai.filter((a) => a.ai_status === "done" || a.ai_status === "failed").length;

  if (sub.status === "processing") {
    return { state: "processing", label: `Analyzing ${doneCount}/${aiTotal}…`, needsReview, aiTotal, doneCount };
  }
  if (sub.status === "failed") {
    return { state: "failed", label: "Failed", needsReview, aiTotal, doneCount };
  }
  if (sub.status === "needs_retake") {
    return { state: "needs_retake", label: "Photos unusable", needsReview, aiTotal, doneCount };
  }
  if (sub.status === "needs_photo_review") {
    return { state: "needs_photo_review", label: "Photo check", needsReview, aiTotal, doneCount };
  }

  // status is complete/partial — layer the review signal on top
  if (aiTotal > 0 && needsReview >= aiTotal) {
    return { state: "no_findings", label: "No usable findings", needsReview, aiTotal, doneCount };
  }
  if (needsReview > 0 || sub.status === "partial") {
    return { state: "needs_review", label: `Needs review (${needsReview})`, needsReview, aiTotal, doneCount };
  }
  return { state: "complete", label: "Complete", needsReview, aiTotal, doneCount };
}

/** Primary label: the user's title, or the date if unnamed. Never the site. */
export function submissionTitle(sub: Submission): string {
  return sub.title?.trim() || new Date(sub.created_at).toLocaleString();
}

/** Where the assessment was taken. */
export function submissionSiteLabel(sub: Submission): string {
  return sub.site?.name?.trim() || sub.site?.code || "Unknown location";
}

/** True when the user set a custom title (so the date should be shown separately). */
export function hasCustomTitle(sub: Submission): boolean {
  return !!sub.title?.trim();
}