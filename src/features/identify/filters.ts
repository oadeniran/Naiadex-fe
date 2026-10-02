import type { Observation, Identification } from "../../lib/types";

export function accepted(o: Observation): Identification | null {
  return o.identifications?.find((i) => i.id === o.accepted_id) ?? o.identifications?.[0] ?? null;
}

export type FilterDef =
  | { id: string; kind: "search"; label: string; fields: (o: Observation) => (string | null | undefined)[] }
  | { id: string; kind: "select"; label: string; value: (o: Observation) => string | null; labelFor?: (v: string) => string }
  | { id: string; kind: "toggle"; label: string; predicate: (o: Observation) => boolean };

export type FilterState = Record<string, string | boolean>;

/** The configured filters. Extend a result field → add one entry here; the UI and
 *  matching adapt automatically. */
export const FILTERS: FilterDef[] = [
  {
    id: "q",
    kind: "search",
    label: "Name",
    fields: (o) => [accepted(o)?.common_name, accepted(o)?.scientific_name],
  },
  {
    id: "category",
    kind: "select",
    label: "Category",
    value: (o) => o.result.category ?? null,
    labelFor: (v) => v.charAt(0).toUpperCase() + v.slice(1),
  },
  {
    id: "status",
    kind: "select",
    label: "Status",
    value: (o) => o.status,
    labelFor: (v) => (v === "reviewed" ? "Reviewed" : "Needs review"),
  },
  // Example future filter (uncomment to enable — no other code changes needed):
  // { id: "freshwater", kind: "toggle", label: "Freshwater only", predicate: (o) => o.result.is_water_related },
];

export type SortDef = { id: string; label: string; cmp: (a: Observation, b: Observation) => number };

export const SORTS: SortDef[] = [
  { id: "newest", label: "Newest", cmp: (a, b) => +new Date(b.created_at) - +new Date(a.created_at) },
  {
    id: "suggestions",
    label: "Most discussed",
    cmp: (a, b) =>
      (b.identifications?.filter((i) => i.source === "human").length ?? 0) -
      (a.identifications?.filter((i) => i.source === "human").length ?? 0),
  },
];

/** Derive the distinct option values present in the data for a 'select' filter. */
export function selectOptions(def: Extract<FilterDef, { kind: "select" }>, items: Observation[]): string[] {
  const set = new Set<string>();
  items.forEach((o) => {
    const v = def.value(o);
    if (v) set.add(v);
  });
  return Array.from(set).sort();
}

/** Apply all active filters + sort to a list. */
export function applyFilters(items: Observation[], state: FilterState, sortId: string): Observation[] {
  let out = items.filter((o) =>
    FILTERS.every((def) => {
      if (def.kind === "search") {
        const q = String(state[def.id] ?? "").trim().toLowerCase();
        if (!q) return true;
        return def.fields(o).some((f) => f?.toLowerCase().includes(q));
      }
      if (def.kind === "select") {
        const sel = state[def.id];
        if (!sel) return true; // "" = All
        return def.value(o) === sel;
      }
      // toggle
      return state[def.id] ? def.predicate(o) : true;
    })
  );
  const sort = SORTS.find((s) => s.id === sortId) ?? SORTS[0];
  return out.slice().sort(sort.cmp);
}