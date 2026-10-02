import type { Submission, Question } from "../../lib/types";
import { distanceKm } from "../../lib/geo";

/** Which rubric questions surface as Explore filters. Edit this list freely —
 *  options come from the live rubric, so adding a key here is all it takes. */
export const RUBRIC_FILTER_KEYS = [
  "channel_form",
  "bottom_type",
  "bank_type",
  "water_aspect",
  "vegetation_type",
  "draining_pipes",
  "sewage_discharge",
  "construction",
  "barriers",
];

export type ExploreFilterState = {
  q: string;                                   // name/place search
  overall: string;                             // "" | GOOD | MODERATE | POOR
  rubric: Record<string, string>;              // questionKey -> selected code/YES/NO ("" = any)
  near: { lat: number; lng: number } | null;   // center point (gps or searched)
  radiusKm: number;
};

export const emptyExploreFilters: ExploreFilterState = {
  q: "",
  overall: "",
  rubric: {},
  near: null,
  radiusKm: 25,
};

/** Does a submission's answer for `key` match the selected value? */
function answerMatches(sub: Submission, key: string, sel: string): boolean {
  if (!sel) return true;
  const a = sub.answers[key];
  if (!a || a.value == null) return false;
  const v = a.value;
  if (Array.isArray(v)) return v.includes(sel);              // multi
  if (typeof v === "object") return Object.values(v as Record<string, unknown>).includes(sel); // side_split
  return String(v) === sel;                                   // single / yesno
}

export function applyExploreFilters(items: Submission[], f: ExploreFilterState): Submission[] {
  let out = items.filter((s) => {
    if (f.overall && String(s.overall?.value ?? "") !== f.overall) return false;
    for (const [key, sel] of Object.entries(f.rubric)) {
      if (sel && !answerMatches(s, key, sel)) return false;
    }
    if (f.q.trim()) {
      const q = f.q.toLowerCase();
      const name = (s.title ?? "").toLowerCase();
      const site = (s.site?.name ?? s.site?.code ?? "").toLowerCase();
      if (!name.includes(q) && !site.includes(q)) return false;
    }
    if (f.near && s.site?.lat != null && s.site?.lng != null) {
      if (distanceKm(f.near, { lat: s.site.lat, lng: s.site.lng }) > f.radiusKm) return false;
    } else if (f.near) {
      return false; // near-filter active but this submission has no coords
    }
    return true;
  });

  // if a location center is set, sort nearest-first
  if (f.near) {
    const center = f.near;
    out = out
      .filter((s) => s.site?.lat != null && s.site?.lng != null)
      .sort((a, b) =>
        distanceKm(center, { lat: a.site!.lat!, lng: a.site!.lng! }) -
        distanceKm(center, { lat: b.site!.lat!, lng: b.site!.lng! })
      );
  }
  return out;
}

/** Build the display options for a rubric filter from the live rubric question. */
export function rubricFilterOptions(q: Question): { value: string; label: string }[] {
  if (q.type === "yesno") {
    return [{ value: "YES", label: "Yes" }, { value: "NO", label: "No" }];
  }
  return q.options.map((o) => ({ value: o.code, label: o.display_name }));
}