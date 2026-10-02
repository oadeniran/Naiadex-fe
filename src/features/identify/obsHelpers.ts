import type { Observation, Identification } from "../../lib/types";

export function accepted(o: Observation): Identification | null {
  return o.identifications?.find((i) => i.id === o.accepted_id) ?? o.identifications?.[0] ?? null;
}

export function confidencePct(conf: number | null | undefined): number | null {
  if (conf == null) return null;
  return Math.round((conf <= 1 ? conf : conf / 100) * 100);
}