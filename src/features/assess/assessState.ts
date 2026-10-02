import type { Feelings, SiteRef } from "../../lib/types";

export type AssessDraft = {
  step: number; // 0=site, 1=photos, 2=human answers, 3=submit
  site: SiteRef | null;
  media: Record<string, string>; // {upstream, downstream, context, biodiversity} -> data URI
  waterHeight: string;
  invasive: "YES" | "NO" | "UNSURE" | null;
  invasiveWhich: string;
  feelings: Feelings;
  photoMode: "labeled" | "unlabeled";
  unlabeled: string[];        // up to 5 data URIs
  video: string | null;       // data URI, stored not analyzed
};

export const emptyDraft: AssessDraft = {
  step: 0,
  site: null,
  media: {},
  waterHeight: "",
  invasive: null,
  invasiveWhich: "",
  feelings: { joy: 3, serenity: 3, anger: 3, fear: 3, na: [] },
  photoMode: "labeled",
  unlabeled: [],
  video: null,
};

export type Action =
  | { type: "goto"; step: number }
  | { type: "setSite"; site: SiteRef }
  | { type: "setPhoto"; label: string; uri: string }
  | { type: "clearPhoto"; label: string }
  | { type: "setField"; field: keyof AssessDraft; value: unknown }
  | { type: "setFeeling"; key: keyof Feelings; value: number }
  | { type: "toggleFeelingNa"; key: string }
  | { type: "reset" }
  | { type: "setPhotoMode"; mode: "labeled" | "unlabeled" }
  | { type: "addUnlabeled"; uri: string }
  | { type: "removeUnlabeled"; index: number }
  | { type: "setVideo"; uri: string | null };

export function reducer(state: AssessDraft, action: Action): AssessDraft {
  switch (action.type) {
    case "goto":
      return { ...state, step: action.step };
    case "setSite":
      return { ...state, site: action.site };
    case "setPhoto":
      return { ...state, media: { ...state.media, [action.label]: action.uri } };
    case "clearPhoto": {
      const media = { ...state.media };
      delete media[action.label];
      return { ...state, media };
    }
    case "setField":
      return { ...state, [action.field]: action.value };
    case "setFeeling":
      return { ...state, feelings: { ...state.feelings, [action.key]: action.value } };
    case "toggleFeelingNa": {
      const na = state.feelings.na.includes(action.key)
        ? state.feelings.na.filter((k) => k !== action.key)
        : [...state.feelings.na, action.key];
      return { ...state, feelings: { ...state.feelings, na } };
    }
    case "setPhotoMode":
      return { ...state, photoMode: action.mode };
    case "addUnlabeled":
      return { ...state, unlabeled: [...state.unlabeled, action.uri] };
    case "removeUnlabeled":
      return { ...state, unlabeled: state.unlabeled.filter((_, i) => i !== action.index) };
    case "setVideo":
      return { ...state, video: action.uri };
    case "reset":
      return emptyDraft;
    default:
      return state;
  }
}