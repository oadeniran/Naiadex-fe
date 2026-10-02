import type { ComponentType } from "react";
import IdentifyFeature from "./identify/IdentifyFeature";
import AssessFeature from "./assess/AssessFeature";
import SubmissionsFeature from "./submissions/SubmissionsFeature";
import ExploreFeature from "./explore/ExploreFeature";
import AboutFeature from "./about/AboutFeature";
import FeedbackFeature from "./feedback/FeedbackFeature";

export type Feature = {
  id: string;
  label: string;
  tagline: string;
  Component: ComponentType;
};

export const FEATURES: Feature[] = [
    { id: "identify", label: "Identify", tagline: "Identify stream life with AI, build your dex, and help verify the community's finds.", Component: IdentifyFeature },
  { id: "assess", label: "Assess a stream", tagline: "Photograph a stream and let AI assess its health — you review and confirm.", Component: AssessFeature },
  { id: "submissions", label: "My submissions", tagline: "Your stream assessments and their AI findings, start to finish.", Component: SubmissionsFeature },
  { id: "explore", label: "Explore", tagline: "Browse stream assessments and discoveries shared by the community.", Component: ExploreFeature },
    { id: "about", label: "About", tagline: "What Naiadex is and how it works.", Component: AboutFeature },
  { id: "feedback", label: "Feedback", tagline: "Tell us what's working and what isn't.", Component: FeedbackFeature },
];