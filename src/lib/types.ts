// ---- shared ----
export type QuestionType = "single" | "multi" | "yesno" | "value";
export type SubmissionStatus =
  | "processing" | "complete" | "partial" | "failed"
  | "needs_retake" | "needs_photo_review" | "finalized";

export type AiStatus = "pending" | "done" | "failed" | "na" | "skipped";

// ---- identify----
export type IdentifyResult = {
  common_name: string;
  scientific_name: string | null;
  category: string | null;
  confidence: number;
  is_water_related: boolean;
  notes: string | null;
};

export type Identification = {
  id: string;
  by: string;
  source: "ai" | "human";
  common_name: string;
  scientific_name: string | null;
  confidence: number | null;
  created_at: string;
};

export type ObsComment = {
  id: string;
  by: string;
  text: string;
  created_at: string;
};

export type Observation = {
  id: string;
  created_at: string;
  result: IdentifyResult;
  lat: number | null;
  lng: number | null;
  image_mime: string | null;
  username: string | null;
  image_url: string | null;
  status: "unreviewed" | "reviewed";
  identifications: Identification[];
  accepted_id: string | null;
  comments: ObsComment[];
};

// ---- rubric ----
export type LabeledImage = { label: string; image: string };

export type Option = {
  code: string;
  display_name: string;
  images: LabeledImage[];
  order: number;
};

export type Question = {
  key: string;
  prompt: string;
  help_text: string | null;
  type: QuestionType;
  side_split: boolean;
  ai_enabled: boolean;
  ai_hint: string | null;
  source_photos: string[];
  order: number;
  active: boolean;
  example_images: LabeledImage[];
  options: Option[];
};

// ---- sites ----
export type City = { id: string; name: string; longitude: number; latitude: number };

export type Site = {
  code: string;
  name: string;
  city: City | null;
  latitude: number;
  longitude: number;
  altitude: number | null;
  polygon: unknown | null; // GeoJSON FeatureCollection; typed loosely until Mapbox uses it
};

export type UserSite = {
  id: string;
  username: string;
  name: string;
  latitude: number;
  longitude: number;
};

// ---- submissions ----
export type AnswerRecord = {
  value: unknown;
  side: string | null;
  source: "ai" | "human";
  ai_status: AiStatus;
  ai_suggestion: unknown;
  ai_confidence: number | null;
  ai_reason: string | null;
  needs_human: boolean;
};

export type SiteRef = {
  type: "existing" | "new";
  code?: string | null;
  name?: string | null;
  lat?: number | null;
  lng?: number | null;
};

export type Feelings = {
  joy: number | null;
  serenity: number | null;
  anger: number | null;
  fear: number | null;
  na: string[];
};

export type Submission = {
  id: string;
  title: string | null;
  created_at: string;
  username: string | null;
  status: SubmissionStatus;
  site: SiteRef;
  answers: Record<string, AnswerRecord>;
  water_height: string | null;
  feelings: Feelings | null;
  media: Record<string, string>;
  gate: Record<string, { ok: boolean; reason: string }> | null;
  reason: string | null;
  overall: Record<string, unknown> | null;
  finalized_at: string | null;
  synthesis: string | null;
};

export type SubmissionCreate = {
  site: SiteRef;
  answers: Record<string, Partial<AnswerRecord>>;
  water_height?: string | null;
  feelings?: Feelings | null;
  media: Record<string, string>;
  photo_mode?: "labeled" | "unlabeled";
};

export type SubmissionReviewPatch = {
  title?: string | null;
  answers?: Record<string, { value: unknown; side?: string }>;
  overall?: { value: string; ai_suggested?: string | null; source?: string };
  feelings?: import("./types").Feelings;
  finalize?: boolean;
};